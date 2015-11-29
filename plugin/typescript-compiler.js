/* global typescriptCompiler */

const ts = Npm.require('typescript');
const _ = Npm.require('lodash');
// const debug = Npm.require('debug')('ts:debug:');

function prepareSourceMap(sourceMapContent, fileContent, sourceMapPath) {
    let sourceMapJson = JSON.parse(sourceMapContent);
    sourceMapJson.sourcesContent = [fileContent];
    sourceMapJson.sources = [sourceMapPath];
    return sourceMapJson;
}

typescriptCompiler = class tsCompiler{
    constructor() {
        /**
         * cache for each host
         */
        this.cache = new Map;

        /**
         * language services
         */
        this.services = this.createServices();

        /**
         * language services host
         */
        this.hostFiles = [];

        /**
         * Source file content
         */
        this.srcContents = new Map;

        /**
         * shared registry document registry
         */
        this.documentRegistry = ts.createDocumentRegistry();

        /**
         * defaults compiler options
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
    }

    createServices() {
        function fileExists(fileName: string): boolean {
            return ts.sys.fileExists(fileName);
        }

        function readFile(fileName: string): string {
            return ts.sys.readFile(fileName);
        }

        // Create the language service host to allow the LS to communicate with the host
        const servicesHost = {
            getScriptFileNames: () => this.hostFiles,
            getScriptVersion: fileName => this.cache.has(fileName) ? this.cache.get(fileName).version : 'immutable',
            getScriptSnapshot: fileName => {
                // debug('Snapshot File: %j', fileName);
                let src = this.srcContents.get(fileName);
                if (src !== undefined) return ts.ScriptSnapshot.fromString(src);
                return undefined;
            },
            getCurrentDirectory: () => process.cwd() + '/',
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
    emitFile(file) {
        let fileName = file.getPathInPackage();
        let fileContent = file.getContentsAsString();
        let packageName = file.getPackageName();
        let sourceMapPath = file.getDisplayPath();

        // debug('Package Name is: %j', packageName);
        try {
            var output = this.services.getEmitOutput(fileName);
        } catch (err) {
            file.error({
                message: err.message
            });
        }
        if (!output.emitSkipped) {
            if (output.outputFiles.length > 0) {

                // get transpiled code
                let moduleName = fileName.replace(/\.tsx?$/, '').replace(/\\/g, '/');
                moduleName = packageName ? packageName + '/' + moduleName : moduleName;

                // bundle for systemjs and amd
                let code = output.outputFiles[1].text
                    .replace("System.register([", 'System.register("' + moduleName + '",[')
                    .replace("define([", 'define("' + moduleName + '",[');
                code = code.slice(0, code.lastIndexOf("//#"));

                // remove source map ref
                this.cache.get(fileName).code = code;

                // make source map
                let map = prepareSourceMap(
                    output.outputFiles[0].text,
                    fileContent,
                    sourceMapPath);
                this.cache.get(fileName).map = map;

                // write to js
                this.cache.get(fileName).version = this.cache.get(fileName).version.slice(3);
                file.addJavaScript({
                    type: 'ts',
                    data: code,
                    path: output.outputFiles[1].name,
                    sourcePath: fileName,
                    sourceMap: map,
                    bare: this.options.module
                });
            } else {
                this.cache.get(fileName).version = this.cache.get(fileName).version.slice(3);
            }
        }
    }

    diagnostics(arch) {
        let program = this.services.getProgram();
        let allDiagnostics = this.services.getCompilerOptionsDiagnostics()
            .concat(program.getSyntacticDiagnostics())
            .concat(program.getSemanticDiagnostics());

        if (allDiagnostics.length) {
            console.info('\n');
            msg[2](` Diagnostics for ${arch}:              `);
        }
        allDiagnostics.forEach(diagnostic => {
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            if (!diagnostic.file) {
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