# aTeX
Lightweight TeX-style mathematics in JavaScript. Designed for [Anki](http://ankisrs.net/) but runs anywhere.

[See it in action with a live demo](https://runassudo.github.io/aTeX/)

## Usage
See *index.html* for example usage.

## Notable Features
* Fractions (`\frac`)
* Square roots (`\sqrt`)
* Automatically sized brackets (`\left` and `\right`)
* Aligned equations (`align` environment)
* Stacked super/subscripts (`x^{y}_{z}`)

## Notes
aTeX is written in [ECMAScript 6 (ECMAScript 2015)](www.ecma-international.org/ecma-262/6.0/), and so either needs to be run in a browser supporting the ECMAScript 6 features used, or compiled to ECMAScript 5 using [babel](https://babeljs.io/), as shown in *build.sh*. [babel-polyfill](https://babeljs.io/docs/usage/polyfill/) may be required for Anki and older browsers.

Currently, no LaTeX (aside from `\$`) is parsed unless in mathematics mode (`$ ... $` or `$$ ... $$`).

Only a limited subset of mathematics macros is supported. See the implementation of *parseMacro* in *main.js* for more information. It is recommended that symbols are input as Unicode characters rather than as macros (à la *unicode-math*).

## Warning
aTeX does not check the input or output data for HTML code. This could introduce an XSS vulnerability into your application. Be careful!
