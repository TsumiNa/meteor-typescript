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
**This package use [typescript@1.6.2](https://github.com/Microsoft/TypeScript/releases/tag/v1.6.2).** See detail about [TypeScript](https://github.com/Microsoft/TypeScript).

All `*.tsx?` files will be compiled to `*.js` and bundld with your Meteor app. Also you can use it with module load system, See detail about [meteor-systemjs](https://github.com/TsumiNa/meteor-systemjs).

This package is not bundle with any ts definiton files. As a alternative, you can use `tsd` cli to manage you definition files. For that which are not managed by the `tsd` or outdated, you must find/make it yourself. Because `*.d.ts` files are also watch by the meteor watch system, just use it like a normal source file. TS Compiler will not compile definition to `*.js`.
![tsd](https://lh4.googleusercontent.com/-vSEr__evlSo/VhdqifeHwPI/AAAAAAAAc5Q/0lIJ5H1-jgk/w196-h734-no/Untitled%2Bpicture.png)

Meteor definiton flies can be found here [Meteor TypeScript libraries](https://github.com/meteor-typescript/meteor-typescript-libs)


## Change Log

#### 0.3.0
- **Incremental building supported**
- When you use module system such as `system` and `amd`, there will no closure surround your codes.

#### 0.2.1
- **[*breaking change*]** Unbundle with systemjs es6 loader. If you need that, please use `tsumina:meteor-systemjs`
```bash
$ meteor add tsumina:meteor-systemjs
```
- **[*breaking change*]** Use `"module": "None"` For default.
- Change message text.

#### 0.2.0
- **[*breaking change*]** Now systemjs es6 loader is bundle with this package, you have no need to add `meteor-systemjs` package anymore, just remove it.
```bash
$ meteor remove tsumina:meteor-systemjs
```
- Error will raise informations for you
- `tsconfig.json` supported 


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
    "sourceMap": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "declaration": false,
    "jsx": "react",
    "target": "ES5",
    "module": "none"
}
```
You can use most of the boolean options except `sourceMap` `noEmit` `noLib` `declaration`and `watch`. Beside these you also can set `module`, `system` `amd` are available. To use module system, you must add [meteor-systemjs](https://github.com/TsumiNa/meteor-systemjs) package to your meteor app.
```bash
$ meteor add tsumina:meteor-systemjs
```

**By dafault no module system will be used**.

Compiler will running a typechecker on all source files and output errors. Since meteor system suggest to fix all the errors before next run but sometimes a reference error is not a problem for user. **You can determining how to treat with errors via `"noEmitOnError"` option**. By default this set to `false` will only raise the error information on the console but do not interrupt the app running. If have errors you will see something like this:
![noEmitOnError: false](https://lh5.googleusercontent.com/-UbRcZixqcwg/VhdUWxs7TzI/AAAAAAAAc4U/U5FuR59xGNk/w807-h361-no/2015-10-09%2B12.48.01.png)

If set to `"noEmitOnError": true`, you must fix all the errors before next run. like this:
![noEmitOnError: true](https://lh6.googleusercontent.com/-4HFtr8yZyUc/VhdUWVCaOkI/AAAAAAAAc4Q/QxS8MAq_UyU/w807-h360-no/2015-10-09%2B12.50.58.png)


### Roadmap

- [x] Support TypeCheck 
- [x] Incremental building support
- [ ] examples for usage
- [ ] Improve README
- [ ] Full tests coverage


### Copyright and license

Code and documentation &copy; 2015 [TsumiNa](https://github.com/TsumiNa)
Released under the MIT license. 
