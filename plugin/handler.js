/* global process */
/* global msg */
/* global Npm */
const ts = Npm.require('typescript');
const fse = Npm.require('fs-extra');
const _ = Npm.require('lodash');
// const debug = Npm.require('debug')('ts:debug:');
Plugin.registerCompiler({
    extensions: ['d.ts', 'ts', 'tsx'],
    filenames: []
}, () => {
    return new Compiler();
});

class Compiler {
    constructor() {
        /**
         * cache for each host
         */
        this.cache = {};

        /**
         * language services
         */
        this.services = {};

        /**
         * language services host
         */
        this.hostFiles = {};

        /**
         * shared registry document registry
         */
        this.documentRegistry = ts.createDocumentRegistry();

        /**
         * compiler options
         */
        this.options = this.options || {
            noEmitOnError: false,
            sourceMap: true,
            emitDecoratorMetadata: true,
            experimentalDecorators: true,
            isolatedModules: false,
            allowNonTsExtensions: true,
            declaration: false,
            jsx: ts.JsxEmit.React,
            target: ts.ScriptTarget.ES5,
            module: ts.ModuleKind.None
        };

        /**
         * init compiler options
         */
        let options = fse.readJsonSync('tsconfig.json', {
            throws: false
        });
        if (options === null || !_.has(options, 'compilerOptions')) {
            msg[0](' Cannot read your \'tsconfig.json\' file. Will use default compiler options');
        } else {
            this.parserOptions(options.compilerOptions);
        }

        /**
         * init language services and cache
         */
        this.services['server'] = this.createServices('server');
        this.cache['server'] = new Map;
        this.services['web.browser'] = this.createServices('web.browser');
        this.cache['web.browser'] = new Map;
        let platforms = fse.readFileSync('.meteor/platforms', 'utf8');
        if (platforms.search('ios') !== -1 || platforms.search('android') !== -1) {
            this.services['web.cordova'] = this.createServices('web.cordova');
            this.cache['web.cordova'] = new Map;
        }

        // starting message
        msg[2](' Using Typescript Compiler......         ');
    }

    createServices(arch) {
        // Create the language service host to allow the LS to communicate with the host
        const servicesHost = {
            getScriptFileNames: () => this.hostFiles[arch],
            getScriptVersion: fileName => this.cache[arch].has(fileName) ? this.cache[arch].get(fileName).version : 'immutable',
            getScriptSnapshot: fileName => ts.ScriptSnapshot.fromString(ts.sys.readFile(fileName)),
            getCurrentDirectory: () => '/',
            getCompilationSettings: () => this.options,
            getDefaultLibFileName: options => ts.getDefaultLibFilePath(options)
        };

        return ts.createLanguageService(servicesHost, this.documentRegistry);
    }

    // override
    processFilesForTarget(files) {
        let arch = files[0].getArch();
        if (arch.search('os.') !== -1) {
            arch = 'server';
        }
        this.hostFiles[arch] = [];
        let compileFiles = []; // need to be comipled

        files.forEach(file => {
            let fileName = file.getPathInPackage();
            let hash = file.getSourceHash();

            // push new files into `hostFiles`
            this.hostFiles[arch].push(fileName);

            if (!this.cache[arch].has(fileName)) {

                // mark file as need compile
                compileFiles.push(fileName);
                this.cache[arch].set(fileName, {
                    version: hash,
                    // extension: file.getExtension(),
                    error: e => file.error(e),
                    addJavaScript: f => file.addJavaScript(f)
                });
            } else {
                if (this.cache[arch].get(fileName).version !== file.getSourceHash()) {
                    compileFiles.push(fileName);
                    this.cache[arch].set(fileName, {
                        version: hash,
                        // extension: file.getExtension(),
                        error: e => file.error(e),
                        addJavaScript: f => file.addJavaScript(f)
                    });
                }
            }
        });

        // exec
        compileFiles.forEach(file => {
            this.emitFile(file, arch);
        });

        // logErrors
        this.logErrors(arch);
    }

    emitFile(file, arch) {
        // debug('Emit Files: %j', file);
        let output = this.services[arch].getEmitOutput(file);
        let moduleName = file.replace(/\.tsx?$/, '').replace(/\\/g, '/');
        if (!output.emitSkipped) {
            if (output.outputFiles.length > 0) {
                this.cache[arch].get(file).addJavaScript({
                    data: output.outputFiles[1].text
                        .replace("System.register([",'System.register("'+moduleName+'",[')
                        .replace("define([",'define("'+moduleName+'",['),
                    path: output.outputFiles[1].name,
                    sourcePath: file,
                    sourceMap: output.outputFiles[0].text,
                    bare: this.options.module ? true : false
                });
            }
        }
    }

    logErrors(arch) {
        let program = this.services[arch].getProgram();
        let allDiagnostics = this.services[arch].getCompilerOptionsDiagnostics()
            .concat(program.getSyntacticDiagnostics())
            .concat(program.getSemanticDiagnostics());

        allDiagnostics.forEach(diagnostic => {
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            let {
                line, character
            } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

            // emit error messages
            if (this.options.noEmitOnError) {
                // stop the meteor app wait for fix
                this.cache[arch].get(diagnostic.file.fileName).error({
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
                this.options.module = ts.ModuleKind.None;
            } else if (module === 'system') {
                this.options.module = ts.ModuleKind.System;
            } else if (module === 'amd') {
                this.options.module = ts.ModuleKind.AMD;
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

        // declaration
        if (_.has(inputOptins, 'declaration')) {
            delete inputOptins.declaration;
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