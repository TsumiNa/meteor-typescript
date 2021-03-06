/* global Package */
Package.describe({
    name: 'tsumina:meteor-typescript',
    version: '0.6.0',
    // Brief, one-line summary of the package.
    summary: 'A configurable typescript compiler for transpiler .ts files to .js and use it both side',
    // URL to the Git repository containing the source code for this package.
    git: 'https://github.com/TsumiNa/meteor-typescript',
    // By default, Meteor will default to using README.md for documentation.
    // To avoid submitting documentation, set this field to null.
    documentation: 'README.md'
});

Package.onUse(function(api) {
    api.versionsFrom('1.2.0.2');
    api.use('isobuild:compiler-plugin@1.0.0');
});

Package.registerBuildPlugin({
    name: 'typescript',
    use: ['ecmascript@0.1.6'],
    sources: [
        'lib/utils.js',
        'plugin/typescript-compiler.js',
        'plugin/handler.js'
    ],
    npmDependencies: {
        'typescript': '1.7.3',
        'chalk': '1.1.1',
        'fs-extra': '0.26.2',
        'lodash': '3.10.1'
    }
});

Package.onTest(function(api) {
    api.use('ecmascript');
    api.use('tinytest');
    api.use('tsumina:meteor-typescript');
    api.addFiles('meteor-typescript-tests.js');
});