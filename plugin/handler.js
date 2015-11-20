/* global process */
/* global msg */
/* global Npm */
const fse = Npm.require('fs-extra');
const _ = Npm.require('lodash');
// const debug = Npm.require('debug')('ts:debug:');

Plugin.registerCompiler({
    extensions: ['d.ts', 'ts', 'tsx'],
    filenames: []
}, () => {
    return new Compiler();
});

class Compiler extends typescriptCompiler {
    constructor() {
        /**
         * Initialization
         */
        super();

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
                    bare: this.options.module ? true : false
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

}