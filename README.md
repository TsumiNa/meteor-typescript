# Meteor-Typescript

[![Build Status](https://travis-ci.org/TsumiNa/meteor-typescript.svg)](https://travis-ci.org/TsumiNa/meteor-typescript)  [![Join the chat at https://gitter.im/TsumiNa/meteor-typescript](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/TsumiNa/meteor-typescript?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

- [Change Log](#change-log)
- [Installation](#installation)
- [Usage](#usage)
- [SystemJS API](#systemjs-api)
- [Roadmap](#roadmap)
- [Copyright and license](#copyright-and-license)

## Use typescript with ES6 modules loader on both side!

**This package add new file extensions: `*.ts` `*.tsx` `*.d.ts`.**
**This package adds SystemJS Module Loader to your project.**

All `*.tsx?` files will be compiled to `*.js` and bundld with your Meteor app. They won't get executed until you request them. Thanks for the **SystenJS Module Loader**, you can use `import` and `export` syntax on both client/server side.

This package is not bundle with any ts definiton files. As a alternative, you can use `tsd` cli to manage you definition files. For that which are not managed by the `tsd` or outdated, you must find/make it yourself. Because `*.d.ts` files are also watch by the meteor watch system, just use it like a normal source file. TS Compiler will not compile definition to `*.js`.
![tsd](https://lh4.googleusercontent.com/-vSEr__evlSo/VhdqifeHwPI/AAAAAAAAc5Q/0lIJ5H1-jgk/w196-h734-no/Untitled%2Bpicture.png)

Meteor definiton flies can be found here [Meteor TypeScript libraries](https://github.com/meteor-typescript/meteor-typescript-libs)

You can combind this with other systemjs required packages like [meteor-aurelia](https://github.com/TsumiNa/meteor-aurelia).

**This package use [typescript@1.6.2](https://github.com/Microsoft/TypeScript/releases/tag/v1.6.2) and [systemjs@0.19.3](https://github.com/systemjs/systemjs/releases/tag/0.19.3)**

See detail about [TypeScript](https://github.com/Microsoft/TypeScript), [SystemJS](https://github.com/systemjs/systemjs) and [tsd](https://github.com/DefinitelyTyped/tsd).

## Change Log

1. **[*breaking change*]** Now systemjs loader is bundle with this package, you have no need to add `meteor-systemjs` package anymore, just remove it.
```bash
$ meteor remove tsumina:meteor-systemjs
```
2. Error will raise informations for you
3. `tsconfig.json` supported 


## Installation

Just add this package to your app:
```bash
$ meteor add tsumina:meteor-typescript
```

## Usage

Assume you have never been used typescript:
```bash
$ npm i -g typescript  # install typescript globally
$ npm i -g tsd  # typescript definiton manager
$ meteor create MyTsApp  # create your app
$ cd MyTsApp
$ tsc --init  # this will create a tsconfig.json file at you root
$ tsd init  # this will create a tsd.json file at you root
$ meteor add tsumina:meteor-typescript  # add typescript compiler
```
These will create a new meteor app for you and typescript support ready!

On initialization, compiler will try to read compile options from `tsconfig.json` which is in your app root directory. If failed, this will use dafault options instead.
- default options
```json
"compilerOptions": {
    "noEmitOnError": false,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "jsx": "react",
    "target": "ES5",
    "module": "system"
}
```
You can use most of the boolean options except `sourceMap` `noEmit` `noLib` and `watch`. Beside these you also can set `module`, but only two choices are available. **`"module": "none"` means no module system and others equal to `"module": "system"`**.

Compiler will running a typechecker on all source files and output errors. Since meteor system suggest to fix all the errors before next run but sometimes a reference error is not a problem for user. **You can determining how to treat with errors via `"noEmitOnError"` option**. By default this set to `false` will only raise the error information on the console but do not interrupt the app running. If have errors you will see something like this:
![noEmitOnError: false](https://lh5.googleusercontent.com/-UbRcZixqcwg/VhdUWxs7TzI/AAAAAAAAc4U/U5FuR59xGNk/w807-h361-no/2015-10-09%2B12.48.01.png)

If set to `"noEmitOnError": true`, you must fix all the errors before next run. like this:
![noEmitOnError: true](https://lh6.googleusercontent.com/-4HFtr8yZyUc/VhdUWVCaOkI/AAAAAAAAc4Q/QxS8MAq_UyU/w807-h360-no/2015-10-09%2B12.50.58.png)



## SystemJS API

Full SystemJS API docs can be found [on their Github repo](https://github.com/systemjs/systemjs/blob/master/docs/system-api.md)


### Roadmap

- [*] Support TypeCheck 
- [ ] examples for usage
- [ ] Improve README
- [ ] Full tests coverage


### Copyright and license

Code and documentation &copy; 2015 [TsumiNa](https://github.com/TsumiNa)
Released under the MIT license. 
