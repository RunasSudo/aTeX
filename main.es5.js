"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

//    aTeX - Lightweight TeX-style mathematics in JavaScript
//    Copyright © 2015  RunasSudo (Yingtong Li)
//
//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU Affero General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU Affero General Public License for more details.
//
//    You should have received a copy of the GNU Affero General Public License
//    along with this program.  If not, see <http://www.gnu.org/licenses/>.

var StringReader = (function () {
	function StringReader(string) {
		_classCallCheck(this, StringReader);

		this.string = string;
		this.ptr = 0;
	}

	_createClass(StringReader, [{
		key: "getPos",
		value: function getPos() {
			return this.ptr;
		}
	}, {
		key: "hasNext",
		value: function hasNext() {
			return this.ptr < this.string.length;
		}
	}, {
		key: "peek",
		value: function peek() {
			if (this.ptr >= this.string.length) {
				return "EOF";
			}
			return this.string[this.ptr];
		}
	}, {
		key: "next",
		value: function next() {
			if (this.ptr >= this.string.length) {
				return "EOF";
			}
			return this.string[this.ptr++];
		}
	}]);

	return StringReader;
})();

var TeXSyntaxError = (function (_Error) {
	_inherits(TeXSyntaxError, _Error);

	function TeXSyntaxError(message) {
		_classCallCheck(this, TeXSyntaxError);

		var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(TeXSyntaxError).call(this, message));

		_this.name = "TeXSyntaxError";
		_this.message = message;
		return _this;
	}

	return TeXSyntaxError;
})(Error);

var MATH_UPRIGHTS = "0-9 +×÷=><≥≤Δ∞%\(\)\?";
var MATH_ACTIVES = "\\^_";
var MATH_VARIABLES = "^#\\$&\\{\\}~\\\\" + MATH_UPRIGHTS + MATH_ACTIVES;

var TeXParser = (function () {
	function TeXParser(reader, options) {
		_classCallCheck(this, TeXParser);

		this.reader = reader;
		this.buffer = "";

		this.options = {};
	}

	_createClass(TeXParser, [{
		key: "parseTeX",
		value: function parseTeX() {
			try {
				while (this.reader.hasNext()) {
					if (this.parseDollarSign() || this.parseTextMacro() || this.parseText()) {} else {
						throw new TeXSyntaxError("Unexpected " + this.reader.peek());
					}
				}
			} catch (ex) {
				this.buffer += '<span class="tex-error">' + ex.name + ': ' + ex.message + ' near ' + this.reader.getPos() + '</span>';
				console.log(ex.name + ": " + ex.message);
				console.log(ex.stack);
			}
			return this.buffer;
		}

		// Swallow and return next character if matches regex, otherwise return false.

	}, {
		key: "accept",
		value: function accept(regex) {
			var strict = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

			if (typeof regex === "string") {
				if (this.reader.peek() === regex) {
					return this.reader.next();
				}
			} else if (this.reader.peek().match(regex)) {
				return this.reader.next();
			}

			if (strict) {
				throw new TeXSyntaxError("Expecting " + regex + ", got " + this.reader.peek());
			}
			return false;
		}

		// Read a string of characters, each of which matches a regex.

	}, {
		key: "readString",
		value: function readString(regex) {
			var buffer = "";
			if (!this.reader.peek().match(regex)) {
				throw new TeXSyntaxError("Expecting " + regex + ", got " + this.reader.peek());
			}

			while (this.reader.hasNext() && this.reader.peek().match(regex)) {
				buffer += this.reader.next();
			}

			return buffer;
		}

		// Accept any character that does not enter maths mode.

	}, {
		key: "parseText",
		value: function parseText() {
			var out = undefined;
			if (out = this.accept(/[^\$\\]/)) {
				this.buffer += out;
				return true;
			}
			return false;
		}
	}, {
		key: "parseTextMacro",
		value: function parseTextMacro() {
			if (!this.accept("\\")) {
				return false;
			}
			if (this.accept("$")) {
				this.buffer += "$";
			} else {
				this.buffer += "\\";
			}
		}

		// Handle entry into maths mode.

	}, {
		key: "parseDollarSign",
		value: function parseDollarSign() {
			if (!this.accept("$")) {
				return false;
			}

			this.mathDisplayMode = this.accept("$");

			this.buffer += '<span class="tex-maths' + (this.mathDisplayMode ? ' tex-maths-display' : 'tex-maths-inline') + '">';
			while (this.reader.hasNext()) {
				if (this.accept("$")) {
					if (this.mathDisplayMode && !this.accept("$")) {
						throw new TeXSyntaxError("Expecting $$, got $");
					}
					this.buffer += '</span>';
					return true;
				} else {
					// Do mathemagics
					this.parseMaths();
				}
			}

			throw new TeXSyntaxError("Expecting $, got EOF");
		}

		// Parse content in maths mode.

	}, {
		key: "parseMaths",
		value: function parseMaths() {
			var out = undefined;
			if (out = this.accept(RegExp("[" + MATH_UPRIGHTS + "]"))) {
				this.buffer += out;
			} else if (this.accept("-")) {
				this.buffer += '−';
			} else if (this.accept("_")) {
				this.buffer += '<sub>';
				this.parseMaths(); // Read a single character or the next group/macro/etc.
				this.buffer += '</sub>';
			} else if (this.accept("^")) {
				this.buffer += '<sup>';
				this.parseMaths();
				this.buffer += '</sup>';
			} else if (this.reader.peek() === "{") {
				this.buffer += new TeXParser(new StringReader("$" + this.parseGroup() + "$")).parseTeX();
			} else if (this.parseMacro()) {} else if (out = this.parseVariable()) {
				this.buffer += '<i class="tex-variable">' + out + '</i>';
			} else {
				throw new TeXSyntaxError("Unexpected " + this.reader.peek());
			}
			return true;
		}
	}, {
		key: "parseVariable",
		value: function parseVariable() {
			if (!this.reader.peek().match(RegExp("[" + MATH_VARIABLES + "]"))) {
				return false;
			}
			return this.readString(RegExp("[" + MATH_VARIABLES + "]"));
		}

		// Return the (mostly) unparsed content in the following group.

	}, {
		key: "parseGroup",
		value: function parseGroup() {
			var buffer = "";
			if (!this.accept("{")) {
				throw new TeXSyntaxError("Expecting {, got " + this.reader.peek());
			}

			// Go through characters, find nested groups and exit on un-nested }
			while (this.reader.hasNext()) {
				if (this.reader.peek() === "{") {
					buffer += "{" + this.parseGroup() + "}";
				} else if (this.reader.peek() === "}") {
					this.accept("}");
					return buffer;
				} else {
					buffer += this.reader.next();
				}
			}

			throw new TeXSyntaxError("Expecting }, got EOF");
		}
	}, {
		key: "parseMacro",
		value: function parseMacro() {
			if (!this.accept("\\")) {
				return false;
			}

			var macro = this.readString(/[a-zA-Z]/);
			var starred = this.accept("*");
			var args = [];
			while (this.reader.peek() === "{") {
				args.push(this.parseGroup());
			}

			if (macro === "uDelta") {
				this.buffer += 'Δ';
			} else if (macro === "approx") {
				this.buffer += '≈ ';
			} else if (macro === "times") {
				this.buffer += '× ';
			} else if (macro === "sin" || macro === "cos" || macro === "tan") {
				this.buffer += macro + ' ';
			} else if (macro === "frac") {
				this.buffer += '<div class="tex-frac"><div class="tex-frac-num">';
				this.buffer += new TeXParser(new StringReader("$" + args[0] + "$")).parseTeX(); // TODO: Make this less dodgy.
				this.buffer += '</div><div class="tex-frac-bar"></div><div class="tex-frac-den">';
				this.buffer += new TeXParser(new StringReader("$" + args[1] + "$")).parseTeX();
				this.buffer += '</div></div>';
			} else if (macro === "text") {
				this.buffer += new TeXParser(new StringReader(args[0])).parseTeX();
			} else if (macro === "mathcal") {
				if (args[0] === "E") {
					this.buffer += 'ℰ';
				}
			} else {
				throw new TeXSyntaxError("Unknown macro " + macro);
			}

			if (args.length == 0) {
				this.accept(" ");
			}

			return true;
		}
	}]);

	return TeXParser;
})();
