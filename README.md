# aTeX
Lightweight TeX-style mathematics in JavaScript. Designed for [Anki](http://ankisrs.net/) but runs anywhere.

[See it in action with a live demo](https://runassudo.github.io/aTeX/)

## Usage
See *example.html* for example usage.

## Notes
aTeX is written in [ECMAScript 6 (ECMAScript 2015)](www.ecma-international.org/ecma-262/6.0/), and so either needs to be run in a browser supporting the ECMAScript 6 features used, or compiled to ECMAScript 5 using [babel](https://babeljs.io/), as shown in *build.sh*.

Currently, no LaTeX (aside from `\$`) is parsed unless in mathematics mode (`$ ... $` or `$$ ... $$`).

Only a limited subset of mathematics macros is supported. See the implementation of *parseMacro* in *main.js* for more information. It is recommended that symbols are input as Unicode characters rather than as macros (à la *unicode-math*).

Spaces are *preserved* in mathematics mode (unlike in LaTeX). Operators do not automatically insert the required spacing (with the exception of macros such as `\times` and `\approx`).

## Warning
aTeX does not check the input or output data for HTML code. This could introduce an XSS vulnerability into your application. Be careful!
