var ts = Npm.require('typescript');

Plugin.registerCompiler({
  extensions: ['ts', 'tsx'],
  filenames: []
}, function () {
  return new Compiler();
});


function Compiler() {}
Compiler.prototype.processFilesForTarget = function (files) {
  files.forEach(function (file) {
    // get work side
    // var arch = file.getArch();
    // console.info(arch);

    // make module name
    var moduleName = file.getPathInPackage().replace(/\\/g,'/').replace('.ts','');

    var output = ts.transpileModule(file.getContentsAsString(), {
      compilerOptions: {
        emitDecoratorMetadata: true,
        jsx: ts.JsxEmit.React,
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.System
      },
      reportDiagnostics: false,
      moduleName: moduleName
    }).outputText;

    // process and add the output
    file.addJavaScript({
      data: output,
      path: file.getPathInPackage().replace('.ts','.js'),
      sourcePath: file.getPathInPackage()
    });
  });
};
