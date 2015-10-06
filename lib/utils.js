// from https://github.com/frankwallis/plugin-typescript/blob/master/lib/utils.js
var typescriptRegex = /\.tsx?$/i;
function isTypescript(file) {
	return typescriptRegex.test(file);
}

var javascriptRegex = /\.js$/i;
function isJavaScript(file) {
	return javascriptRegex.test(file);
}

var mapRegex = /\.map$/i;
function isSourceMap(file) {
	return mapRegex.test(file);
}

var declarationRegex = /\.d\.tsx?$/i;
function isTypescriptDeclaration(file) {
	return declarationRegex.test(file);
}

function tsToJs(tsFile) {
	return tsFile.replace(typescriptRegex, '.js');
}

function tsToJsMap(tsFile) {
	return tsFile.replace(typescriptRegex, '.js.map');
}

var htmlRegex = /\.html$/i;
function isHtml(file) {
	return htmlRegex.test(file);
}
