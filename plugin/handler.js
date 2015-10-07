const ts = Npm.require('typescript');
const fs = Npm.require('fs');
const jsonfile = Npm.require('jsonfile');

// default options
const
    options = {
        noEmitOnError: false,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        jsx: ts.JsxEmit.React,
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.System
    };

// check .tsrc
fs.access('.tsrc', function(err) {
    if (err) {
        jsonfile.writeFile('.tsrc', options, {
            spaces: 4
        }, err => {
            if (err) throw err;
        });
        Plugin.registerCompiler({
            extensions: ['d.ts', 'ts', 'tsx'],
            filenames: []
        }, () => {
            return new Compiler(options);
        });

    } else {
        let _options = jsonfile.readFileSync('.tsrc');
        Plugin.registerCompiler({
            extensions: ['d.ts', 'ts', 'tsx'],
            filenames: []
        }, () => {
            return new Compiler(_options);
        });
    };
})


class Compiler {
    constructor(options) {
        this._cache = new Map();
        this._options = options || {
            noEmitOnError: false,
            emitDecoratorMetadata: true,
            experimentalDecorators: true,
            jsx: ts.JsxEmit.React,
            target: ts.ScriptTarget.ES5,
            module: ts.ModuleKind.System
        };
        let _msg = msg.Message('Typescript Compiler is running on: ' + process.cwd());
        console.info(_msg);
    }

    processFilesForTarget(files) {
        let _cache = new Map(),
            _complieFiles = [];

        files.forEach(file => {
            let _filePath = file.getPathInPackage(),
                _fileHash = file.getSourceHash(),
                _fileExtension = file.getExtension();

            if (_fileExtension === 'd.ts') {
                _complieFiles.push(_filePath);
            } else{
                if (!this._cache.has(_fileHash)) {
                    _complieFiles.push(_filePath);
                    _cache.set(_fileHash, _filePath);
                } else {
                    this._cache.delete(_fileHash);
                    _cache.set(_fileHash, _filePath);
                }
            };

            this._cache.clear();
            this._cache = _cache;
        })

        this.processer(_complieFiles, this._options, files)
    }

    processer(fileNames, options, files) {
        let program = ts.createProgram(fileNames, options);
        let emitResult = program.emit(undefined, (outputName, output) => {
            output = output.replace("System.register([", 'System.register("' + outputName + '",[');
            files[0].addJavaScript({
                data: output,
                path: outputName
                // sourcePath: outputName.
            });
        });

        let allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

        allDiagnostics.forEach(diagnostic => {
            let {
                line, character
            } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        });

        if (emitResult.emitSkipped) {
            // noEmitOnError: true
        };
    }
}