"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

//    aTeX - Lightweight TeX-style mathematics in JavaScript
//    Copyright © 2015-2016  RunasSudo (Yingtong Li)
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

var TeXSyntaxError = function (_Error) {
	_inherits(TeXSyntaxError, _Error);

	function TeXSyntaxError(message) {
		_classCallCheck(this, TeXSyntaxError);

		var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(TeXSyntaxError).call(this, message));

		_this.name = "TeXSyntaxError";
		_this.message = message;
		return _this;
	}

	return TeXSyntaxError;
}(Error);

// why u no class variables, JS?

var MATHS_UPRIGHTS = "0-9Δ∞%\\(\\)\\[\\]\\?";
var MATHS_BINARIES = "+×÷=><≥≤";
var MATHS_ACTIVES = "\\^\\- _\\*'";
var MATHS_VARIABLES = "^#\\$&\\{\\}~\\\\" + MATHS_UPRIGHTS + MATHS_BINARIES + MATHS_ACTIVES;

var MATHS_MACROS = {
	cos: 'cos ',
	rightarrow: ' ⟶ ',
	sin: 'sin ',
	sum: '∑',
	tan: 'tan ',
	uDelta: 'Δ'
};
var MATHS_MACROS_BINARIES = {
	approx: '≈',
	propto: '∝',
	times: '×'
};

var TeXParser = function () {
	_createClass(TeXParser, null, [{
		key: "parseString",
		value: function parseString(string) {
			var context = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

			if (context.mathsMode) {
				return new TeXParser(new StringReader(string).mutate(context), context).parseMaths();
			} else {
				return new TeXParser(new StringReader(string).mutate(context), context).parseTeX();
			}
		}
	}]);

	function TeXParser(reader) {
		var context = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

		_classCallCheck(this, TeXParser);

		this.reader = reader;
		this.buffer = "";

		this.context = Object.create(context);
		this.context.mathsMode = "mathsMode" in this.context ? this.context.mathsMode : false;
		this.context.mathsDisplayMode = "mathsDisplayMode" in this.context ? this.context.mathsDisplayMode : false;
		this.context.parseEntities = "parseEntities" in this.context ? this.context.parseEntities : false;
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

		// Like parseTeX, but begin in maths mode.

	}, {
		key: "parseMaths",
		value: function parseMaths() {
			try {
				while (this.reader.hasNext()) {
					this.parseMathsSymbol();
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

			if (this.reader.hasNext()) {
				if (typeof regex === "string") {
					if (this.reader.peek() === regex) {
						return this.reader.next();
					}
				} else if (this.reader.peek().match(regex)) {
					return this.reader.next();
				}
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

			this.context.mathsMode = this.accept("$") ? "display" : "inline";
			this.reader = this.reader.mutate(this.context);

			this.buffer += '<span class="tex-maths tex-maths-' + this.context.mathsMode + '">';
			while (this.reader.hasNext()) {
				if (this.accept("$")) {
					if (this.context.mathsMode === "display" && !this.accept("$")) {
						throw new TeXSyntaxError("Expecting $$, got $");
					}
					this.buffer += '</span>';

					this.context.mathsMode = false;
					this.reader = this.reader.mutate(this.context);

					return true;
				} else {
					// Do mathemagics
					this.parseMathsSymbol();
				}
			}

			throw new TeXSyntaxError("Expecting $, got EOF");
		}

		// Parse a "single" maths symbol.

	}, {
		key: "parseMathsSymbol",
		value: function parseMathsSymbol() {
			var out = undefined;
			if (out = this.accept(RegExp("[" + MATHS_UPRIGHTS + "]"))) {
				this.buffer += out;
			} else if (out = this.accept(RegExp("[" + MATHS_BINARIES + "]"))) {
				if (this.context.mathsMode === "compact") {
					this.buffer += out;
				} else {
					this.buffer += ' ' + out + ' ';
				}
			} else if (this.accept(" ")) {} else if (this.accept("-")) {
				if (this.context.mathsMode === "ce" && this.accept(">")) {
					this.buffer += ' ⟶ '; // It's actually an arrow in disguise
				} else {
						if (this.buffer.endsWith(" ")) {
							// Last input was probably an operator
							this.buffer += '−'; // Unary minus
						} else {
								this.buffer += ' − '; // Binary minus
							}
					}
			} else if (this.accept("*")) {
					this.buffer += '∗';
				} else if (this.accept("'")) {
					this.buffer += '′';
				} else if (out = this.accept(/[_\^]/)) {
					var newContext = Object.create(this.context);
					if (this.context.mathsMode === "ce") newContext.mathsMode = "compact";
					var parser = new TeXParser(this.reader, newContext);

					this.buffer += '<span class="tex-subsup">';
					do {
						this.buffer += '<span class="' + (out === "_" ? 'sub' : 'sup') + '">';

						parser.buffer = "";
						parser.parseMathsSymbol(); // Read a single character or the next group/macro/etc.
						this.buffer += parser.buffer;

						this.buffer += '</span>';
					} while (out = this.accept(/[_\^]/)); // Too much recursion. Time for loops!
					this.buffer += '</span>';
				} else if (this.reader.peek() === "{") {
					this.buffer += TeXParser.parseString(this.readGroup(), this.context);
				} else if (this.parseMacro()) {} else if (out = this.accept(RegExp("[" + MATHS_VARIABLES + "]"))) {
					this.buffer += '<i class="tex-variable">' + out + '</i>';
				} else {
					throw new TeXSyntaxError("Unexpected " + this.reader.peek());
				}
			return true;
		}

		// Return the (mostly) unparsed content in the following group.

	}, {
		key: "readGroup",
		value: function readGroup() {
			var buffer = "";
			if (!this.accept("{")) {
				throw new TeXSyntaxError("Expecting {, got " + this.reader.peek());
			}

			// Go through characters, find nested groups and exit on un-nested }
			while (this.reader.hasNext()) {
				if (this.reader.peek() === "{") {
					buffer += "{";
					buffer += this.readGroup();
					buffer += "}";
				} else if (this.reader.peek() === "}") {
					this.accept("}");
					return buffer;
				} else {
					buffer += this.reader.next();
				}
			}

			throw new TeXSyntaxError("Expecting }, got EOF");
		}

		// Read macro call data, excluding initial backslash

	}, {
		key: "readMacro",
		value: function readMacro() {
			var macro = this.readString(/[a-zA-Z]/);
			var starred = this.accept("*");
			var args = [];
			while (this.reader.peek() === "{") {
				args.push(this.readGroup());
			}

			return [macro, starred, args];
		}
	}, {
		key: "unreadMacro",
		value: function unreadMacro(macro, starred, args) {
			var buffer = "";
			buffer += "\\" + macro + (starred ? "*" : "");
			var _iteratorNormalCompletion = true;
			var _didIteratorError = false;
			var _iteratorError = undefined;

			try {
				for (var _iterator = args[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
					var arg = _step.value;

					buffer += "{" + arg + "}";
				}
			} catch (err) {
				_didIteratorError = true;
				_iteratorError = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion && _iterator.return) {
						_iterator.return();
					}
				} finally {
					if (_didIteratorError) {
						throw _iteratorError;
					}
				}
			}

			return buffer;
		}
	}, {
		key: "parseMacro",
		value: function parseMacro() {
			if (!this.accept("\\")) {
				return false;
			}

			var _readMacro = this.readMacro();

			var _readMacro2 = _slicedToArray(_readMacro, 3);

			var macro = _readMacro2[0];
			var starred = _readMacro2[1];
			var args = _readMacro2[2];

			return this.handleMacro(macro, starred, args);
		}
	}, {
		key: "handleMacro",
		value: function handleMacro(macro, starred, args) {
			// WARNING: The whitespace that follows is misleading!

			if (MATHS_MACROS[macro]) {
				this.buffer += MATHS_MACROS[macro];
			} else if (MATHS_MACROS_BINARIES[macro]) {
				if (this.context.mathsMode === "compact") {
					this.buffer += MATHS_MACROS_BINARIES[macro];
				} else {
					this.buffer += ' ' + MATHS_MACROS_BINARIES[macro] + ' ';
				}
			} else if (macro === "begin") {
				this.parseEnvironment(args[0]);
			} else if (macro === "end") {
				throw new TeXSyntaxError("Unexpected \\end{" + args[0] + "}");
			} else if (macro === "ce") {
				this.buffer += '<span class="tex-maths-upright">';

				var newContext = Object.create(this.context);
				newContext.mathsMode = "ce";

				this.buffer += TeXParser.parseString(args[0], newContext);
				this.buffer += '</span>';
			} else if (macro === "frac") {
				this.buffer += '<span class="tex-frac"><span class="tex-frac-num">';
				this.buffer += TeXParser.parseString(args[0], this.context);

				var denHeight = TeXParser.estimateMathsHeight(args[1], this.context);
				this.buffer += '</span><span class="tex-frac-bar"></span><span class="tex-frac-den" style="top: ' + (denHeight - 0.3) + 'em;">';

				this.buffer += TeXParser.parseString(args[1], this.context);
				this.buffer += '</span></span>';
			} else if (macro === "left") {
				var _readDelimited = this.readDelimited();

				var _readDelimited2 = _slicedToArray(_readDelimited, 3);

				var content = _readDelimited2[0];
				var left = _readDelimited2[1];
				var right = _readDelimited2[2];

				var contentHeight = TeXParser.estimateMathsHeight(content, this.context);
				var transform = '-webkit-transform: scale(1, ' + contentHeight + '); transform: scale(1, ' + contentHeight + ');';
				this.buffer += '<span class="tex-delim" style="' + transform + '">' + left + '</span>';
				this.buffer += TeXParser.parseString(content, this.context);
				this.buffer += '<span class="tex-delim" style="' + transform + '">' + right + '</span>';
				// Anki's QtWebView doesn't support unprefixed CSS transforms :(
			} else if (macro === "right") {
					throw new TeXSyntaxError("Unexpected \\right" + this.reader.next());
				} else if (macro === "log" || macro === "ln" || macro === "lg" || macro === "lb") {
					this.buffer += macro;
					if (this.reader.peek() !== "_") {
						this.buffer += ' ';
					}
				} else if (macro === "mathcal") {
					if (args[0] === "E") {
						this.buffer += 'ℰ';
					}
				} else if (macro === "overline") {
					this.buffer += '<span class="tex-overline">';
					this.buffer += TeXParser.parseString(args[0], this.context);
					this.buffer += '</span>';
				} else if (macro === "sqrt") {
					this.buffer += '<span class="tex-sqrt"><span>';
					this.buffer += TeXParser.parseString(args[0], this.context);
					this.buffer += '</span></span>';
				} else if (macro === "symbf") {
					this.buffer += '<b class="tex-symbf">';
					this.buffer += TeXParser.parseString(args[0], this.context);
					this.buffer += '</b>';
				} else if (macro === "text") {
					var newContext = Object.create(this.context);
					newContext.mathsMode = false;

					this.buffer += TeXParser.parseString(args[0], newContext);
				} else {
					throw new TeXSyntaxError("Unknown macro " + macro);
				}

			if (args.length === 0) {
				this.accept(" ");
			}

			return true;
		}

		// Return the (mostly) unparsed content in the following delimited thingo, plus the delimiters.

	}, {
		key: "readDelimited",
		value: function readDelimited() {
			var buffer = "";
			var left = this.reader.next();

			// Go through characters, find nested delimited things and exit on un-nested \rightX
			while (this.reader.hasNext()) {
				if (this.accept("\\")) {
					if (this.reader.peek().match(/[a-zA-Z]/)) {
						var _readMacro3 = this.readMacro();

						var _readMacro4 = _slicedToArray(_readMacro3, 3);

						var macro = _readMacro4[0];
						var starred = _readMacro4[1];
						var args = _readMacro4[2];

						if (macro === "left") {
							var _readDelimited3 = this.readDelimited();

							var _readDelimited4 = _slicedToArray(_readDelimited3, 3);

							var content = _readDelimited4[0];
							var nestedLeft = _readDelimited4[1];
							var nestedRight = _readDelimited4[2];

							buffer += "\\left" + nestedLeft + content + "\\right" + nestedRight;
						} else if (macro === "right") {
							var right = this.reader.next();
							return [buffer, left, right];
						} else {
							buffer += this.unreadMacro(macro, starred, args);
						}
					} else {
						buffer += "\\";
					}
				} else {
					buffer += this.reader.next();
				}
			}

			throw new TeXSyntaxError("Expecting \\right, got EOF");
		}

		// Return the (mostly) unparsed content in the following environment.

	}, {
		key: "readEnvironment",
		value: function readEnvironment(name) {
			var buffer = "";

			// Go through characters, find nested environments and exit on un-nested \end{name}
			while (this.reader.hasNext()) {
				if (this.accept("\\")) {
					if (this.reader.peek().match(/[a-zA-Z]/)) {
						var _readMacro5 = this.readMacro();

						var _readMacro6 = _slicedToArray(_readMacro5, 3);

						var macro = _readMacro6[0];
						var starred = _readMacro6[1];
						var args = _readMacro6[2];

						if (macro === "begin") {
							buffer += "\\begin{";
							buffer += args[0];
							buffer += "}";
							buffer += this.readEnvironment(args[0]);
							buffer += "\\end{" + args[0] + "}";
						} else if (macro === "end") {
							if (args[0] !== name) {
								throw new TeXSyntaxError("Expecting \\end{" + name + "}, got \\end{" + args[0] + "}");
							}
							return buffer;
						} else {
							buffer += this.unreadMacro(macro, starred, args);
						}
					} else {
						buffer += "\\";
					}
				} else {
					buffer += this.reader.next();
				}
			}

			throw new TeXSyntaxError("Expecting \\end{" + name + "}, got EOF");
		}
	}, {
		key: "parseEnvironment",
		value: function parseEnvironment(name) {
			if (name === "align") {
				var reader = new StringReader(this.readEnvironment(name)).mutate(this.context);

				var newContext = Object.create(this.context);
				newContext.mathsMode = "display";

				var parser = new TeXParser(reader, newContext);

				this.buffer += '<div class="tex-align">';
				this.buffer += '<div><span class="tex-align-lhs">'; // row, col

				// Slightly modified parseMaths()
				while (reader.hasNext()) {
					parser.buffer = ""; // We add the parser's buffer to ours after every symbol, so reset here

					if (parser.accept("&")) {
						this.buffer += '</span>&nbsp;<span class="tex-align-rhs">'; // TODO: Better way of handling spaces
					} else if (parser.accept("\\")) {
							if (reader.peek().match(/[a-zA-Z]/)) {
								// A macro

								var _parser$readMacro = parser.readMacro();

								var _parser$readMacro2 = _slicedToArray(_parser$readMacro, 3);

								var macro = _parser$readMacro2[0];
								var starred = _parser$readMacro2[1];
								var args = _parser$readMacro2[2];

								parser.handleMacro(macro, starred, args);
								this.buffer += parser.buffer;
							} else if (parser.accept("\\")) {
								// A newline
								this.buffer += '</span></div>'; // col, row
								this.buffer += '<div><span class="tex-align-lhs">';
							} else {
								throw new TeXSyntaxError("Unexpected " + reader.next());
							}
						} else {
							parser.parseMathsSymbol();
							this.buffer += parser.buffer;
						}
				}

				this.buffer += '</span></div></div>'; // col, row, tex-align
			} else {
					throw new TeXSyntaxError("Unknown environment " + name);
				}
		}

		// Estimate the height of the given maths-mode code in em's

	}], [{
		key: "estimateMathsHeight",
		value: function estimateMathsHeight(code, context) {
			var height = 0;

			var reader = new StringReader(code).mutate(context);
			var parser = new TeXParser(reader, context);

			while (reader.hasNext()) {
				// Recurse through macros
				if (parser.accept("\\")) {
					if (reader.peek().match(/[a-zA-Z]/)) {
						var _parser$readMacro3 = parser.readMacro();

						var _parser$readMacro4 = _slicedToArray(_parser$readMacro3, 3);

						var macro = _parser$readMacro4[0];
						var starred = _parser$readMacro4[1];
						var args = _parser$readMacro4[2];

						if (macro === "frac") {
							height = Math.max(height, TeXParser.estimateMathsHeight(args[0], context) + TeXParser.estimateMathsHeight(args[1], context));
						} else if (macro === "sqrt") {
							height = Math.max(height, 1.3);
						} else if (macro === "overline") {
							height = Math.max(height, 1.2);
						}
					}
				} else {
					height = Math.max(height, 1);
					reader.next();
				}
			}

			return height;
		}
	}]);

	return TeXParser;
}();
"use strict";

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

//    aTeX - Lightweight TeX-style mathematics in JavaScript
//    Copyright © 2015-2016  RunasSudo (Yingtong Li)
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

var Reader = function () {
	function Reader() {
		_classCallCheck(this, Reader);
	}

	_createClass(Reader, [{
		key: "mutate",
		value: function mutate(context) {
			var reader = this;
			// Only process entities in maths mode
			reader = context.mathsMode && context.parseEntities ? reader.toHtmlAware() : reader.notHtmlAware();
			return reader;
		}
	}]);

	return Reader;
}();

var StringReader = function (_Reader) {
	_inherits(StringReader, _Reader);

	function StringReader(string) {
		_classCallCheck(this, StringReader);

		var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(StringReader).call(this));

		_this.string = string;
		_this.ptr = 0;
		return _this;
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
			if (!this.hasNext()) {
				throw new TeXSyntaxError("Unexpected EOF");
			}
			return this.string[this.ptr];
		}
	}, {
		key: "next",
		value: function next() {
			var result = this.peek();
			this.ptr++;
			return result;
		}
	}, {
		key: "toHtmlAware",
		value: function toHtmlAware() {
			var reader = new HTMLAwareStringReader(this.string);
			reader.ptr = this.ptr;
			return reader;
		}
	}, {
		key: "notHtmlAware",
		value: function notHtmlAware() {
			var reader = new StringReader(this.string);
			reader.ptr = this.ptr;
			return reader;
		}
	}]);

	return StringReader;
}(Reader);

var HTMLAwareStringReader = function (_StringReader) {
	_inherits(HTMLAwareStringReader, _StringReader);

	function HTMLAwareStringReader(string) {
		_classCallCheck(this, HTMLAwareStringReader);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(HTMLAwareStringReader).call(this, string));
	}

	_createClass(HTMLAwareStringReader, [{
		key: "readEntity",
		value: function readEntity() {
			var out = "";
			var entity = "";
			var ptr = this.ptr;
			while (this.hasNext() && (out = this.string[ptr++]) != ";") {
				entity += out;
			}
			return entity + ";";
		}
	}, {
		key: "peek",
		value: function peek() {
			if (!this.hasNext()) {
				throw new TeXSyntaxError("Unexpected EOF");
			}
			if (_get(Object.getPrototypeOf(HTMLAwareStringReader.prototype), "peek", this).call(this) === "&") {
				var tmp = document.createElement("div");
				tmp.innerHTML = this.readEntity();
				return tmp.textContent;
			} else {
				return _get(Object.getPrototypeOf(HTMLAwareStringReader.prototype), "peek", this).call(this);
			}
		}
	}, {
		key: "next",
		value: function next() {
			if (!this.hasNext()) {
				throw new TeXSyntaxError("Unexpected EOF");
			}
			if (_get(Object.getPrototypeOf(HTMLAwareStringReader.prototype), "peek", this).call(this) === "&") {
				var entity = this.readEntity();
				this.ptr += entity.length;

				var tmp = document.createElement("div");
				tmp.innerHTML = entity;
				return tmp.textContent;
			}

			var result = this.peek();
			this.ptr++;
			return result;
		}
	}]);

	return HTMLAwareStringReader;
}(StringReader);
