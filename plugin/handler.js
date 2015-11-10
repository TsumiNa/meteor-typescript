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
            noLib: false,
            noEmitOnError: false,
            sourceMap: true,
            emitDecoratorMetadata: true,
            experimentalDecorators: true,
            allowNonTsExtensions: true,
            declaration: false,
            jsx: ts.JsxEmit.React,
            target: ts.ScriptTarget.ES5,
            module: ts.ModuleKind.None
        };

        /**
         * init compiler options
         */
        fse.ensureFileSync('tsconfig.json');
        if (fse.readFileSync('tsconfig.json', 'utf8').length === 0) {
            msg[0](' No \'tsconfig.json\' file be found. Will use default compiler options');
            fse.removeSync('tsconfig.json');
        } else {
            let options = fse.readJsonSync('tsconfig.json', {
                throws: false
            });
            if (options === null || !_.has(options, 'compilerOptions')) {
                msg[0](' Cannot read your \'tsconfig.json\' file. Will use default compiler options');
            } else {
                this.parserOptions(options.compilerOptions);
            }
        }

        /**
         * init language services and cache
         */
        this.services['server'] = this.createServices('server');
        this.cache['server'] = new Map;
        this.services['web.browser'] = this.createServices('web.browser');
        this.cache['web.browser'] = new Map;
        fse.ensureFileSync('.meteor/platforms');
        let platforms = fse.readFileSync('.meteor/platforms', 'utf8');
        if (platforms.length === 0) {
            msg[1](' Cannot read your \'platforms\' file.');
            fse.removeSync('.meteor/platforms');
        } else if (platforms.search('ios') !== -1 || platforms.search('android') !== -1) {
            this.services['web.cordova'] = this.createServices('web.cordova');
            this.cache['web.cordova'] = new Map;
        }

        // starting message
        msg[2](' Using Typescript Compiler......         ');
    }

    createServices(arch) {
        function fileExists(fileName: string): boolean {
            return ts.sys.fileExists(fileName);
        }

        function readFile(fileName: string): string {
            return ts.sys.readFile(fileName);
        }

        // Create the language service host to allow the LS to communicate with the host
        const servicesHost = {
            getScriptFileNames: () => this.hostFiles[arch],
            getScriptVersion: fileName => this.cache[arch].has(fileName) ? this.cache[arch].get(fileName).version : 'immutable',
            getScriptSnapshot: fileName => {
                // debug('Snapshot File: %j', fileName);
                return ts.ScriptSnapshot.fromString(ts.sys.readFile(fileName))
            },
            getCurrentDirectory: () => '/',
            getCompilationSettings: () => this.options,
            getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
            resolveModuleNames: (moduleNames, containingFile) => {
                return moduleNames.map(moduleName => {
                    // try to use standard resolution
                    let result = ts.resolveModuleName(moduleName, containingFile, this.options, {
                        fileExists, readFile
                    });
                    if (result.resolvedModule) {
                        return result.resolvedModule;
                    }
                    return undefined;
                });
            }
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

            // push new files into `hostFiles`
            this.hostFiles[arch].push(fileName);

            // check changed files
            let hash = file.getSourceHash();
            if (!this.cache[arch].has(fileName)) {
                // debug('Compile new File: %j', fileName);
                this.cache[arch].set(fileName, {
                    version: hash + 'tmp',
                    code: undefined,
                    map: undefined,
                    error: e => file.error(e),
                    addJavaScript: f => file.addJavaScript(f)
                });
                // d.ts files exclude
                if (file.getExtension() === 'd.ts') return;
                compileFiles.push(fileName);

            } else if (this.cache[arch].get(fileName).version !== file.getSourceHash()) {
                // debug('Compile changed File: %j', fileName);
                this.cache[arch].set(fileName, {
                    version: hash + 'tmp',
                    error: e => file.error(e),
                    addJavaScript: f => file.addJavaScript(f)
                });

                // d.ts files exclude
                if (file.getExtension() === 'd.ts') return;
                compileFiles.push(fileName);

            } else {
                // debug('Unchanged File: %j', fileName)
                // d.ts files exclude
                if (file.getExtension() === 'd.ts') return;
                file.addJavaScript({
                    data: this.cache[arch].get(fileName).code,
                    path: fileName.replace(/\.tsx?$/, '.js'),
                    sourceMap: this.cache[arch].get(fileName).map,
                    bare: this.options.module ? true : false
                });
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
        // debug('Emit File: %j', file);
        let output = this.services[arch].getEmitOutput(file);
        if (!output.emitSkipped && output.outputFiles.length > 0) {
            let moduleName = file.replace(/\.tsx?$/, '').replace(/\\/g, '/');
            let code = output.outputFiles[1].text
                .replace("System.register([", 'System.register("' + moduleName + '",[')
                .replace("define([", 'define("' + moduleName + '",[');
            let map = output.outputFiles[0].text;
            this.cache[arch].get(file).code = code;
            this.cache[arch].get(file).map = map;
            this.cache[arch].get(file).version = this.cache[arch].get(file).version.slice(0, -3);
            this.cache[arch].get(file).addJavaScript({
                data: code,
                path: output.outputFiles[1].name,
                sourceMap: map,
                bare: this.options.module ? true : false
            });
        }
    }

    logErrors(arch) {
        let program = this.services[arch].getProgram();
        let allDiagnostics = this.services[arch].getCompilerOptionsDiagnostics()
            .concat(program.getSyntacticDiagnostics())
            .concat(program.getSemanticDiagnostics());

        allDiagnostics.forEach(diagnostic => {
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            if (diagnostic.file === undefined) {
                msg[1](` ${message}`);
                return;
            }
            let {
                line, character
            } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

            // emit error messages
            if (this.options.noEmitOnError) {
                // stop the meteor app wait for fix
                // debug('Emit Error File: %j', diagnostic.file.fileName);
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

        // target
        if (_.has(inputOptins, 'target')) {
            let target = inputOptins.target.toLowerCase();
            if (target === 'es3') {
                this.options.target = ts.ScriptTarget.ES3;
            } else if (target === 'es5') {
                this.options.target = ts.ScriptTarget.ES5;
            } else if (target === 'es6') {
                this.options.target = ts.ScriptTarget.ES6;
            } else {
                msg[0](' Cannot set \"target\" as \"' + inputOptins.target + '\", will use \"ES5\"');
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