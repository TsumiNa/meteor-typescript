/* global msg */
/* global Npm */
const ts = Npm.require('typescript');
const fse = Npm.require('fs-extra');
const _ = Npm.require('underscore');

Plugin.registerCompiler({
    extensions: ['d.ts', 'ts', 'tsx'],
    filenames: []
}, () => {
    return new Compiler();
});


class Compiler {
    constructor() {
        this.cache = new Map; // cacheing compiled files
        this.options = this.options || {
            noEmitOnError: false,
            emitDecoratorMetadata: true,
            experimentalDecorators: true,
            jsx: ts.JsxEmit.React,
            target: ts.ScriptTarget.ES5,
            module: ts.ModuleKind.System
        };

        let options = fse.readJsonSync('.tsrc', {throws: false});
        if (options === null) {
            msg[0](' Error when try to use read your \'.tsrc\' file. Will use detault compile options');
        } else {
            this.parser(options);
        }

        // starting message
        msg[2](' Typescript Compiler is running on: ' + process.cwd());
    }

    // override
    processFilesForTarget(files) {

        let complieFiles = [],
            flieArch = files[0].getArch();

        if (!this.cache.has(flieArch)) {
            this.cache.set(flieArch, new Map);
        }

        // check input files find which was modified
        // push them into `complieFiles`
        files.forEach((file, index) => {
            let filePath = file.getPathInPackage(),
                fileHash = file.getSourceHash(),
                fileExtension = file.getExtension();

            this.cache.get(flieArch).set(filePath, {
                hash: fileHash,
                index: index,
                extension: fileExtension
            });

            complieFiles.push(filePath);
        });

        // exec
        this.processer(complieFiles, files, flieArch);
    }

    processer(fileNames, files, fileArch) {

        let program = ts.createProgram(fileNames, this.options);
        let emitResult = program.emit(undefined, (outputName, output) => {
            let filePath = outputName.replace('.js', '');
            // let _index = this.cache.get(fileArch).get(filePath).index;
            output = output.replace('System.register([', 'System.register("' + filePath + '",[');
            files[0].addJavaScript({
                data: output,
                path: outputName
                // sourcePath: outputName.
            });
        });

        let allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
        allDiagnostics.forEach(diagnostic => {
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            let {
                    line, character
                } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

            // emit error messages
            if (emitResult.emitSkipped) {
                // stop the meteor app wait for fix
                let index = this.cache.get(fileArch).get(diagnostic.file.fileName).index;
                files[index].error({
                    message: message,
                    column: character + 1,
                    line: line + 1
                });
            } else {
                let category = diagnostic.category;
                msg[category](` [${diagnostic.file.fileName}](${line + 1},${character + 1}): ${message}`);
            }
        });
    }

    parser(inputOptins){
        _.extendOwn(this.options, _.pick(inputOptins, (value) => {
            return _.isBoolean(value);
        }));
    }
}