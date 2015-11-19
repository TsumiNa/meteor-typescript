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

function prepareSourceMap(sourceMapContent, fileContent, sourceMapPath) {
    let sourceMapJson = JSON.parse(sourceMapContent);
    sourceMapJson.sourcesContent = [fileContent];
    sourceMapJson.sources = [sourceMapPath];
    return sourceMapJson;
}


class Compiler {
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

        // starting message
        msg[2](' Using Typescript Compiler......         ');
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

    // override
    processFilesForTarget(files) {
        this.hostFiles = [];
        this.srcContents.clear();
        let compileFiles = []; // need to be compiled
        let arch = files[0].getArch();

        files.forEach(file => {
            let fileName = file.getPathInPackage();
            let packageName = file.getPackageName();
            let fileContent = file.getContentsAsString();
            let version = file.getSourceHash();

            // push new files into `hostFiles`
            this.hostFiles.push(fileName);
            this.srcContents.set(fileName, fileContent);

            // filter files
            if (!this.cache.has(fileName)) {
                // debug('Compile new File: %j', fileName);
                if (file.getExtension() === 'd.ts') {
                    this.cache.set(fileName, {
                        version: version,
                        error: e => file.error(e),
                        code: undefined,
                        map: undefined
                    });
                    return;
                }
                this.cache.set(fileName, {
                    version: 'pre' + version,
                    error: e => file.error(e),
                    code: undefined,
                    map: undefined
                });
                compileFiles.push(file);

            } else if (this.cache.get(fileName).version !== version) {
                // debug('Compile changed File: %j', fileName);
                if (file.getExtension() === 'd.ts') {
                    this.cache.set(fileName, {
                        version: version,
                        error: e => file.error(e),
                    });
                    return;
                }
                this.cache.set(fileName, {
                    error: e => file.error(e),
                    version: 'pre' + version,
                });
                compileFiles.push(file);

            } else {
                // debug('Unchanged File: %j', fileName)
                // d.ts files exclude
                if (file.getExtension() === 'd.ts') return;
                file.addJavaScript({
                    type: 'ts',
                    data: this.cache.get(fileName).code,
                    path: fileName.replace(/\.tsx?$/, '.js'),
                    sourcePath: fileName,
                    sourceMap: this.cache.get(fileName).map,
                    bare: this.options.module !== ts.ModuleKind.None ? true : false
                });
            }
        });

        // exec
        compileFiles.forEach(file => {
            this.emitFile(file);
        });

        // diagnostics
        this.diagnostics(arch);

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
                moduleName = packageName ? packageName.slice(packageName.indexOf(":") + 1) + '/' + moduleName : moduleName;

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
                    bare: this.options.module !== ts.ModuleKind.None ? true : false
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
            console.info('\n');
            msg[2](` Diagnostics for ${arch}:            \n`);
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