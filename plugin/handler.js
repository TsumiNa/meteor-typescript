const ts = Npm.require('typescript');
const fs = Npm.require('fs');

Plugin.registerCompiler({
    extensions: ['ts', 'tsx'],
    filenames: []
}, () => {
    return new Compiler();
});

class Compiler {
    constructor() {
        this._cache = this._cache || {};
        this._files = this._files || [];
        this._options = this._options || {
                    noEmitOnError: false,
                    emitDecoratorMetadata: true,
                    experimentalDecorators: true,
                    jsx: ts.JsxEmit.React,
                    target: ts.ScriptTarget.ES5,
                    module: ts.ModuleKind.System
                };

        console.info('Typescript Compiler is running on: ' + process.cwd());
    }
    processFilesForTarget(files) {
        files.forEach(file => {
            this._files.push(file.getPathInPackage());
        })
        this.processer(this._files, this._options, files)
        // files.forEach(function(file) {
        //     // console.info(file.getPathInPackage());
        //     // get work side
        //     // var arch = file.getArch();
        //     // console.info(arch);

        //     // make module name
        //     var moduleName = file.getPathInPackage().replace(/.tsx?/, '');

        //     var transpileOutput = ts.transpileModule(file.getContentsAsString(), {
        //         compilerOptions: {
        //             emitDecoratorMetadata: true,
        //             experimentalDecorators: true,
        //             jsx: ts.JsxEmit.React,
        //             target: ts.ScriptTarget.ES5,
        //             module: ts.ModuleKind.System
        //         },
        //         reportDiagnostics: true,
        //         moduleName: moduleName
        //     });

        //     // process and add the output
        //     file.addJavaScript({
        //         data: output,
        //         path: file.getPathInPackage().replace(/.tsx?/, '.js'),
        //         sourcePath: file.getPathInPackage()
        //     });
        // });
    }

    processer(fileNames, options, files) {
        let program = ts.createProgram(fileNames, options);
        let emitResult = program.emit(undefined, (outputName, output) => {
            output = output.replace("System.register([",'System.register("'+outputName+'",[');
            files[0].addJavaScript({
                data: output,
                path: outputName
                // sourcePath: outputName.
            });
        });

        let allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

        allDiagnostics.forEach(diagnostic => {
            let {line, character} = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        });

        if (emitResult.emitSkipped) {
            // noEmitOnError: true
        };
    }
}