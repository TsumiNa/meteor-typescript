/* global msg */
/* global Npm */
const ts = Npm.require('typescript');
const fse = Npm.require('fs-extra');

// default options
const
    options = {
        noEmitOnError: true,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        jsx: ts.JsxEmit.React,
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.System
    };

Plugin.registerCompiler({
    extensions: ['d.ts', 'ts', 'tsx'],
    filenames: []
}, () => {
    return new Compiler(options);
});
// check .tsrc
// fse.ensureFile('.tsrc', function(err) {
//     if (err) {
//         fse.outputJson('.tsrc', options, {
//             spaces: 4
//         }, err => {
//             if (err) throw err;
//         });

//     } else {
//         let _options = fse.readJsonSync('.tsrc');
//         Plugin.registerCompiler({
//             extensions: ['d.ts', 'ts', 'tsx'],
//             filenames: []
//         }, () => {
//             return new Compiler(_options);
//         });
//     };
// })


class Compiler {
    constructor(options) {
        this._cache = new Map; // cacheing compiled files
        this._options = options || {
            noEmitOnError: true,
            emitDecoratorMetadata: true,
            experimentalDecorators: true,
            jsx: ts.JsxEmit.React,
            target: ts.ScriptTarget.ES5,
            module: ts.ModuleKind.System
        };

        // starting message
        let _msg = msg.Message('Typescript Compiler is running on: ' + process.cwd());
        console.info(_msg);
    }

    // override
    processFilesForTarget(files) {
        let _msg_1 = msg.Message('111111111111111');
        console.info(_msg_1);

        let _complieFiles = [],
            _flieArch = files[0].getArch();

        if (!this._cache.has(_flieArch)) {
            this._cache.set(_flieArch, new Map);
        }


        // check input files find which was modified
        // push them into `_complieFiles`
        files.forEach((file, index) => {
            let _filePath = file.getPathInPackage(),
                _fileHash = file.getSourceHash(),
                _fileExtension = file.getExtension();

            if (_fileExtension === 'd.ts') {
                _complieFiles.push(_filePath);
            } else {
                if (!this._cache.get(_flieArch).has(_filePath) ||
                    this._cache.get(_flieArch).get(_filePath).hash !== _fileHash) {
                    _complieFiles.push(_filePath);
                }
            }

            this._cache.get(_flieArch).set(_filePath, {
                hash: _fileHash,
                index: index
            });
        });

        // exec
        this._processer(_complieFiles, files, _flieArch);

        let _msg_2 = msg.Error('222222222222222');
        console.info(_msg_2);
    }

    _processer(fileNames, files, fileArch) {

        let _msg_3 = msg.Warning(fileNames);
        console.info(_msg_3);


        let program = ts.createProgram(fileNames, this._options);
        let emitResult = program.emit(undefined, (outputName, output) => {
                let index = this._cache.get(fileArch).get(outputName).index;
                output = output.replace('System.register([', 'System.register("' + outputName + '",[');
                files[index].addJavaScript({
                    data: output,
                    path: outputName
                    // sourcePath: outputName.
                });
            }),
            allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics),
            pName = '';

        allDiagnostics.forEach(diagnostic => {
            let filename = diagnostic.file.fileName,
                message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
                index = this._cache.get(fileArch).get(filename).index,
                {line, character} = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

            // emit error messages
            if (emitResult.emitSkipped) {
                // stop the meteor app wait for fix
                files[index].error({
                    message: message,
                    column: character + 1,
                    line: line + 1
                });
            } else {
                console.info(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
            }

            if (pName !== filename && pName !== '') {
                this._cache.get(fileArch).delete(pName);
            }
            pName = filename;
        });
        this._cache.get(fileArch).delete(pName);

    }
}