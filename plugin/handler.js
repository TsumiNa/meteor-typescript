/* global process */
/* global msg */
/* global Npm */
const ts = Npm.require('typescript');
const fse = Npm.require('fs-extra');
const _ = Npm.require('lodash');
var debug = Npm.require('debug')('ts:debug:');
Plugin.registerCompiler({
    extensions: ['d.ts', 'ts', 'tsx'],
    filenames: []
}, () => {
    return new Compiler();
});

class Compiler {
    constructor() {
        this.cache = new Map;
        this.complieFiles = [];
        this.emitSkipped = false;
        this.options = this.options || {
            noEmitOnError: false,
            sourceMap: true,
            emitDecoratorMetadata: true,
            experimentalDecorators: true,
            jsx: ts.JsxEmit.React,
            target: ts.ScriptTarget.ES5,
            module: ts.ModuleKind.None
        };

        let options = fse.readJsonSync('tsconfig.json', {
            throws: false
        });
        if (options === null || !_.has(options, 'compilerOptions')) {
            msg[0](' Cannot read your \'tsconfig.json\' file. Will use default compiler options');
        } else {
            this.parserOptions(options.compilerOptions);
        }

        // init language services
        this.services = this.createServices();

        // starting message
        msg[2](' Using Typescript Compiler......         ');
    }

    createServices() {
        // Create the language service host to allow the LS to communicate with the host
        const servicesHost = {
            getScriptFileNames: () => this.complieFiles,
            getScriptVersion: (fileName) => this.cache.get(fileName) !== undefined ? this.cache.get(fileName).version : 'const',
            getScriptSnapshot: (fileName) => ts.ScriptSnapshot.fromString(ts.sys.readFile(fileName)),
            getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
            getCompilationSettings: () => this.options,
            getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
        };

        return ts.createLanguageService(servicesHost, ts.createDocumentRegistry());
    }

    // override
    processFilesForTarget(files) {
        this.complieFiles = [];
        // push them into `complieFiles`
        files.forEach((file, index) => {
            this.cache.set(file.getPathInPackage(), {
                version: file.getSourceHash(),
                error: e => file.error(e),
                addJavaScript: f => file.addJavaScript(f),
                extension: file.getExtension()
            });
            this.complieFiles.push(file.getPathInPackage());
        });

        // exec
        this.complieFiles.forEach(file => {
            this.emitFile(file);
        })

        // logErrors
        this.logErrors();
    }

    emitFile(file) {
        debug('Emit Files: %j', file);
        let output = this.services.getEmitOutput(file);

        if (!output.emitSkipped) {
            if (output.outputFiles[0] !== undefined) {
                this.cache.get(file).addJavaScript({
                    data: output.outputFiles[1].text,
                    path: output.outputFiles[1].name,
                    sourceMap: output.outputFiles[0].text,
                    bare: true
                })
            }
            return;
        }
        this.emitSkipped = true;
    }

    logErrors() {
        let program = this.services.getProgram();
        let allDiagnostics = this.services.getCompilerOptionsDiagnostics()
            .concat(program.getSyntacticDiagnostics())
            .concat(program.getSemanticDiagnostics());

        allDiagnostics.forEach(diagnostic => {
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            let {
                line, character
            } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

            // emit error messages
            if (this.emitSkipped) {
                // stop the meteor app wait for fix
                this.cache.get(diagnostic.file.fileName).error({
                    message: message,
                    column: character + 1,
                    line: line + 1
                });
                return;
            }
            let category = diagnostic.category;
            msg[category](` [${diagnostic.file.fileName}](${line + 1},${character + 1}): ${message}`);
        });
    }

    parserOptions(inputOptins) {
        // can use none module
        if (_.has(inputOptins, 'module')) {
            let module = inputOptins.module.toLowerCase();
            if (module === 'none') {
                this.options.module = 0;
            } else if (module === 'system') {
                this.options.module = 4;
            } else if (module === 'amd') {
                this.options.module = 2;
            } else {
                msg[0](' Cannot use \"module\": \"' + inputOptins.module + '\" option, \"module\" will be set to \"None\"');
            }
        }

        // don't use user sourceMap configuration
        if (_.has(inputOptins, 'sourceMap')) {
            delete inputOptins.sourceMap;
        }

        // noEmit
        if (_.has(inputOptins, 'noEmit')) {
            delete inputOptins.noEmit;
        }

        // noLib
        if (_.has(inputOptins, 'noLib')) {
            delete inputOptins.noLib;
        }

        // watch
        if (_.has(inputOptins, 'watch')) {
            delete inputOptins.watch;
        }

        _.assign(this.options, _.pick(inputOptins, (value) => {
            return _.isBoolean(value) || _.isNumber(value);
        }));
    }
}