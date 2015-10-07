// from https://github.com/frankwallis/plugin-typescript/blob/master/lib/utils.js
function isTypescript(file) {
    var typescriptRegex = /\.tsx?$/i;
    return typescriptRegex.test(file);
}

function isJavaScript(file) {
    var javascriptRegex = /\.js$/i;
    return javascriptRegex.test(file);
}

function isSourceMap(file) {
    var mapRegex = /\.map$/i;
    return mapRegex.test(file);
}

function isTypescriptDeclaration(file) {
    var declarationRegex = /\.d\.tsx?$/i;
    return declarationRegex.test(file);
}

function tsToJs(tsFile) {
    return tsFile.replace(typescriptRegex, '.js');
}

function tsToJsMap(tsFile) {
    return tsFile.replace(typescriptRegex, '.js.map');
}

function isHtml(file) {
    var htmlRegex = /\.html$/i;
    return htmlRegex.test(file);
}