# Meteor-Typescript

[![Join the chat at https://gitter.im/TsumiNa/meteor-typescript](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/TsumiNa/meteor-typescript?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Build Status](https://travis-ci.org/TsumiNa/meteor-typescript.svg)](https://travis-ci.org/TsumiNa/meteor-typescript)

- [Installation](#installation)
- [Usage](#usage)
- [SystemJS API](#systemjs-api)
- [Roadmap](#roadmap)
- [Copyright and license](#copyright-and-license)

## Use typescript with ES6 modules loader on both side!

**This package add new file extensions:** `*.ts`
**This package adds SystemJS to your project.**

All `*.ts` files will be compiled to `*.js` and bundld with your Meteor app. They won't get executed until you request them. SystenJS support both side.

You can combind this with other systemjs required packages like [meteor-aurelia](https://github.com/TsumiNa/meteor-aurelia).

**This package use [typescript@1.6.2](https://github.com/Microsoft/TypeScript/releases/tag/v1.6.2) and [systemjs@0.19.3](https://github.com/systemjs/systemjs/releases/tag/0.19.3)**

See detail about [TypeScript](https://github.com/Microsoft/TypeScript) and [SystemJS](https://github.com/systemjs/systemjs)


## Installation

Just add this package to your app:
```bash
$ meteor add tsumina:meteor-typescript
```

## Usage

TODO


## SystemJS API

Full SystemJS API docs can be found [on their Github repo](https://github.com/systemjs/systemjs/blob/master/docs/system-api.md)


### Roadmap

- [ ] Improve README
- [ ] Support TypeCheck 
- [ ] Full tests coverage


### Copyright and license

Code and documentation &copy; 2015 [TsumiNa](https://github.com/TsumiNa)
Released under the MIT license. 
