"use strict";

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
		this.context.arch = "arch" in this.context ? this.context.arch : {
			MATHS_UPRIGHTS: "",
			MATHS_ACTIVES: {},
			MATHS_MACROS: {},
			MATHS_ENVIRONMENTS: {}
		};
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
				console.log(this);
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
				console.log(this);
			}
			return this.buffer;
		}
	}, {
		key: "accept",


		// Swallow and return next character if matches regex, otherwise return false.
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
			var out = void 0;
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
			var out = void 0;
			if (out = this.accept(TeXParser.toRegex(this.context.arch.MATHS_UPRIGHTS))) {
				this.buffer += out;
			} else if (this.accept(" ")) {} else if (out = this.accept(TeXParser.toRegex(Object.keys(this.context.arch.MATHS_ACTIVES).join("")))) {
				this.context.arch.MATHS_ACTIVES[out](this, out);
			} else if (this.reader.peek() === "{") {
				this.buffer += TeXParser.parseString(this.readGroup(), this.context);
			} else if (this.parseMacro()) {} else if (out = this.accept(TeXParser.toRegex("#\\$&\\{\\}~\\\\" + this.context.arch.MATHS_UPRIGHTS + Object.keys(this.context.arch.MATHS_ACTIVES).join(""), true))) {
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

			var macro = this.readString(/[a-zA-Z]/);
			return this.handleMacro(macro);
		}
	}, {
		key: "readMacroArgs",
		value: function readMacroArgs(num) {
			var args = [];
			for (var i = 0; i < num; i++) {
				while (this.accept(" ")) {} // Gobble whitespace.

				if (this.reader.peek() == "{") {
					args.push(this.readGroup());
				} else {
					args.push(this.reader.next());
				}
			}
			return args;
		}
	}, {
		key: "handleMacro",
		value: function handleMacro(macro) {
			//while (this.accept(" ")); // Gobble whitespace.

			if (this.context.arch.MATHS_MACROS[macro]) {
				this.context.arch.MATHS_MACROS[macro](this, macro);
			} else if (macro === "begin") {
				var env = this.readMacroArgs(1)[0];
				if (this.context.arch.MATHS_ENVIRONMENTS[env]) {
					this.context.arch.MATHS_ENVIRONMENTS[env](this, env);
				} else {
					throw new TeXSyntaxError("Unknown environment " + name);
				}
			} else if (macro === "end") {
				throw new TeXSyntaxError("Unexpected \\end{" + this.readMacroArgs(1)[0] + "}");
			} else {
				throw new TeXSyntaxError("Unknown macro " + macro);
			}

			return true;
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
						var macro = this.readString(/[a-zA-Z]/);

						if (macro === "begin") {
							var args = this.readMacroArgs(1);

							buffer += "\\begin{";
							buffer += args[0];
							buffer += "}";
							buffer += this.readEnvironment(args[0]);
							buffer += "\\end{" + args[0] + "}";
						} else if (macro === "end") {
							var args = this.readMacroArgs(1);

							if (args[0] !== name) {
								throw new TeXSyntaxError("Expecting \\end{" + name + "}, got \\end{" + args[0] + "}");
							}
							return buffer;
						} else {
							buffer += "\\" + macro;
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

		// Estimate the height of the given maths-mode code in em's

	}], [{
		key: "toRegex",
		value: function toRegex(chars) {
			var negate = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

			if (chars[0] === "^") {
				chars = chars.replace("^", "") + "^"; // To include a literal ^, put it anywhere but first.
			}
			if (chars.includes("-")) {
				chars = chars.replace("-", "") + "-"; // To include a literal -, put it last.
			}
			return RegExp("[" + (negate ? "^" : "") + chars + "]");
		}
	}, {
		key: "estimateMathsHeight",
		value: function estimateMathsHeight(code, context) {
			var height = 0;

			var reader = new StringReader(code).mutate(context);
			var parser = new TeXParser(reader, context);

			while (reader.hasNext()) {
				// Recurse through macros
				if (parser.accept("\\")) {
					if (reader.peek().match(/[a-zA-Z]/)) {
						var macro = parser.readString(/[a-zA-Z]/);

						if (macro === "frac") {
							var args = parser.readMacroArgs(2);
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
		key: "peekEntity",
		value: function peekEntity() {
			var out = "";
			var entity = "";
			var ptr = this.ptr;
			while (ptr < this.string.length && (out = this.string[ptr++]) != ";") {
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
				var entity = this.peekEntity();

				if (entity === "&nbsp;") {
					return " ";
				} else {
					var tmp = document.createElement("div");
					tmp.innerHTML = this.peekEntity();
					return tmp.textContent;
				}
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
				var entity = this.peekEntity();
				this.ptr += entity.length;

				if (entity === "&nbsp;") {
					return " ";
				} else {
					var tmp = document.createElement("div");
					tmp.innerHTML = entity;
					return tmp.textContent;
				}
			}

			var result = this.peek();
			this.ptr++;
			return result;
		}
	}]);

	return HTMLAwareStringReader;
}(StringReader);
"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

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

var Plugin = function Plugin(parser) {
	_classCallCheck(this, Plugin);

	this.parser = parser;
};

var PluginBasic = function (_Plugin) {
	_inherits(PluginBasic, _Plugin);

	function PluginBasic() {
		_classCallCheck(this, PluginBasic);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(PluginBasic).apply(this, arguments));
	}

	_createClass(PluginBasic, [{
		key: "enable",
		value: function enable() {
			this.parser.context.arch.MATHS_UPRIGHTS += "0123456789%\\(\\)\\[\\]\\?∞↑→↓←";

			this.parser.context.arch.MATHS_ACTIVES["+"] = PluginBasic.binaryMacro('+');
			this.parser.context.arch.MATHS_ACTIVES["×"] = PluginBasic.binaryMacro('×');
			this.parser.context.arch.MATHS_ACTIVES["÷"] = PluginBasic.binaryMacro('÷');
			this.parser.context.arch.MATHS_ACTIVES["="] = PluginBasic.binaryMacro('=');
			this.parser.context.arch.MATHS_ACTIVES["≈"] = PluginBasic.binaryMacro('≈');
			this.parser.context.arch.MATHS_ACTIVES[">"] = PluginBasic.binaryMacro('>');
			this.parser.context.arch.MATHS_ACTIVES["<"] = PluginBasic.binaryMacro('<');
			this.parser.context.arch.MATHS_ACTIVES["≥"] = PluginBasic.binaryMacro('≥');
			this.parser.context.arch.MATHS_ACTIVES["≤"] = PluginBasic.binaryMacro('≤');
			this.parser.context.arch.MATHS_ACTIVES["*"] = PluginBasic.textMacro('∗');
			this.parser.context.arch.MATHS_ACTIVES["'"] = PluginBasic.textMacro('′');
			this.parser.context.arch.MATHS_MACROS["approx"] = PluginBasic.binaryMacro('≈');
			this.parser.context.arch.MATHS_MACROS["cos"] = PluginBasic.opMacro('cos');
			this.parser.context.arch.MATHS_MACROS["cot"] = PluginBasic.opMacro('cot');
			this.parser.context.arch.MATHS_MACROS["csc"] = PluginBasic.opMacro('csc');
			this.parser.context.arch.MATHS_MACROS["uparrow"] = PluginBasic.textMacro(' ↑ ');
			this.parser.context.arch.MATHS_MACROS["downarrow"] = PluginBasic.textMacro(' ↓ ');
			this.parser.context.arch.MATHS_MACROS["leftarrow"] = PluginBasic.textMacro(' ← ');
			this.parser.context.arch.MATHS_MACROS["rightarrow"] = PluginBasic.textMacro(' → ');
			this.parser.context.arch.MATHS_MACROS["in"] = PluginBasic.textMacro('∈');
			this.parser.context.arch.MATHS_MACROS["parallel"] = PluginBasic.textMacro('∥');
			this.parser.context.arch.MATHS_MACROS["perp"] = PluginBasic.textMacro('⟂');
			this.parser.context.arch.MATHS_MACROS["propto"] = PluginBasic.textMacro('∝');
			this.parser.context.arch.MATHS_MACROS["sec"] = PluginBasic.opMacro('sec');
			this.parser.context.arch.MATHS_MACROS["sin"] = PluginBasic.opMacro('sin');
			this.parser.context.arch.MATHS_MACROS["tan"] = PluginBasic.opMacro('tan');
			this.parser.context.arch.MATHS_MACROS["therefore"] = PluginBasic.textMacro('∴ ');
			this.parser.context.arch.MATHS_MACROS["times"] = PluginBasic.binaryMacro('×');
			this.parser.context.arch.MATHS_MACROS["to"] = PluginBasic.binaryMacro('→');

			this.parser.context.arch.MATHS_ACTIVES["-"] = function (parser, char) {
				if (parser.context.mathsMode === "compact") {
					parser.buffer += '−';
				} else if (parser.buffer.endsWith(" ")) {
					// Last input was probably an operator
					// TODO: More robust detection
					parser.buffer += '−'; // Unary minus
				} else {
					parser.buffer += ' − '; // Binary minus
				}
			};

			this.parser.context.arch.MATHS_ACTIVES["^"] = function (parser, char) {
				var newContext = Object.create(parser.context);
				if (parser.context.mathsMode === "ce") newContext.mathsMode = "compact";
				var parser2 = new TeXParser(parser.reader, newContext);

				parser.buffer += '<span class="tex-subsup">';
				do {
					parser.buffer += '<span class="' + (char === "_" ? 'sub' : 'sup') + '">';

					parser2.buffer = "";
					parser2.parseMathsSymbol(); // Read a single character or the next group/macro/etc.
					parser.buffer += parser2.buffer;

					parser.buffer += '</span>';
				} while (char = parser.accept(/[_\^]/)); // Too much recursion. Time for loops!
				parser.buffer += '</span>';
			};
			this.parser.context.arch.MATHS_ACTIVES["_"] = this.parser.context.arch.MATHS_ACTIVES["^"];

			this.parser.context.arch.MATHS_MACROS["frac"] = function (parser, macro) {
				var args = parser.readMacroArgs(2);

				parser.buffer += '<span class="tex-frac"><span class="tex-frac-num">';
				parser.buffer += TeXParser.parseString(args[0], parser.context);

				var denHeight = TeXParser.estimateMathsHeight(args[1], parser.context);
				parser.buffer += '</span><span class="tex-frac-bar"></span><span class="tex-frac-den" style="top: ' + (denHeight - 0.3) + 'em;">';

				parser.buffer += TeXParser.parseString(args[1], parser.context);
				parser.buffer += '</span></span>';
			};

			this.parser.context.arch.MATHS_MACROS["left"] = function (parser, macro) {
				var _PluginBasic$readDeli = PluginBasic.readDelimited(parser);

				var _PluginBasic$readDeli2 = _slicedToArray(_PluginBasic$readDeli, 3);

				var content = _PluginBasic$readDeli2[0];
				var left = _PluginBasic$readDeli2[1];
				var right = _PluginBasic$readDeli2[2];

				PluginBasic.printDelimited(parser, content, left, right);
			};

			this.parser.context.arch.MATHS_MACROS["right"] = function (parser, macro) {
				throw new TeXSyntaxError("Unexpected \\right" + this.reader.next());
			};

			this.parser.context.arch.MATHS_MACROS["log"] = PluginBasic.opMacro('log');
			this.parser.context.arch.MATHS_MACROS["ln"] = PluginBasic.opMacro('ln');
			this.parser.context.arch.MATHS_MACROS["lg"] = PluginBasic.opMacro('lg');
			this.parser.context.arch.MATHS_MACROS["lb"] = PluginBasic.opMacro('lb');

			this.parser.context.arch.MATHS_MACROS["mathcal"] = function (parser, macro) {
				if (parser.readMacroArgs(1)[0] === "E") {
					parser.buffer += 'ℰ';
				}
				// TODO: Better
			};

			this.parser.context.arch.MATHS_MACROS["overline"] = function (parser, macro) {
				parser.buffer += '<span class="tex-overline">';
				parser.buffer += TeXParser.parseString(parser.readMacroArgs(1)[0], parser.context);
				parser.buffer += '</span>';
			};
			this.parser.context.arch.MATHS_MACROS["sqrt"] = function (parser, macro) {
				parser.buffer += '<span class="tex-sqrt"><span>';
				parser.buffer += TeXParser.parseString(parser.readMacroArgs(1)[0], parser.context);
				parser.buffer += '</span></span>';
			};
			this.parser.context.arch.MATHS_MACROS["symbf"] = function (parser, macro) {
				parser.buffer += '<b class="tex-bold">';
				parser.buffer += TeXParser.parseString(parser.readMacroArgs(1)[0], parser.context);
				parser.buffer += '</b>';
			};
			this.parser.context.arch.MATHS_MACROS["symup"] = function (parser, macro) {
				parser.buffer += '<span class="tex-maths-upright">';
				parser.buffer += TeXParser.parseString(parser.readMacroArgs(1)[0], parser.context);
				parser.buffer += '</span>';
			};

			this.parser.context.arch.MATHS_MACROS["sum"] = function (parser, macro) {
				parser.buffer += '<span class="tex-limit"><span class="tex-limit-mid" style="font-size: 1.5em; top: -0.4em;">∑</span class="tex-limit-mid">';

				var out = void 0;
				while (out = parser.accept(/[_\^]/)) {
					parser.buffer += '<span class="tex-limit-' + (out === "_" ? 'bot' : 'top') + '" style="top: ' + (out === "_" ? '1.4' : '-1.6') + 'em;">';
					parser.parseMathsSymbol();
					parser.buffer += '</span>';
				}

				parser.buffer += '</span>';
			};
			this.parser.context.arch.MATHS_MACROS["lim"] = function (parser, macro) {
				parser.buffer += '<span class="tex-limit"><span class="tex-limit-mid">lim</span class="tex-limit-mid">';

				var out = void 0;
				while (out = parser.accept(/[_\^]/)) {
					parser.buffer += '<span class="tex-limit-' + (out === "_" ? 'bot' : 'top') + '">';
					parser.parseMathsSymbol();
					parser.buffer += '</span>';
				}

				parser.buffer += '</span> ';
			};

			this.parser.context.arch.MATHS_MACROS["text"] = function (parser, macro) {
				var newContext = Object.create(parser.context);
				newContext.mathsMode = false;

				parser.buffer += TeXParser.parseString(parser.readMacroArgs(1)[0], newContext);
			};

			this.parser.context.arch.MATHS_ENVIRONMENTS["align"] = function (parser, env) {
				var newContext = Object.create(parser.context);
				newContext.mathsMode = "display";
				newContext.parseEntities = false; // We have already processed any entities.

				var reader = new StringReader(parser.readEnvironment(env)).mutate(newContext);

				var parser2 = new TeXParser(reader, newContext);

				parser.buffer += '<div class="tex-align">';
				parser.buffer += '<div><span class="tex-align-lhs">'; // row, col

				// Slightly modified parseMaths()
				while (reader.hasNext()) {
					parser2.buffer = ''; // We add the parser's buffer to ours after every symbol, so reset here

					if (parser2.accept("&")) {
						parser.buffer += '</span>&nbsp;<span class="tex-align-rhs">'; // TODO: Better way of handling spaces
					} else if (parser2.accept("\\")) {
						if (reader.peek().match(/[a-zA-Z]/)) {
							// A macro
							var macro = parser2.readString(/[a-zA-Z]/);
							parser2.handleMacro(macro);
							parser.buffer += parser2.buffer;
						} else if (parser2.accept("\\")) {
							// A newline
							parser.buffer += '</span></div>'; // col, row
							parser.buffer += '<div><span class="tex-align-lhs">';
						} else {
							throw new TeXSyntaxError("Unexpected " + reader.next());
						}
					} else {
						parser2.parseMathsSymbol();
						parser.buffer += parser2.buffer;
					}
				}

				parser.buffer += '</span></div></div>'; // col, row, tex-align
			};
		}

		// Return the (mostly) unparsed content in the following delimited thingo, plus the delimiters.

	}], [{
		key: "readDelimited",
		value: function readDelimited(parser) {
			var buffer = "";
			var left = parser.reader.next();

			// Go through characters, find nested delimited things and exit on un-nested \rightX
			while (parser.reader.hasNext()) {
				if (parser.accept("\\")) {
					if (parser.reader.peek().match(/[a-zA-Z]/)) {
						var macro = parser.readString(/[a-zA-Z]/);

						if (macro === "left") {
							var _PluginBasic$readDeli3 = PluginBasic.readDelimited();

							var _PluginBasic$readDeli4 = _slicedToArray(_PluginBasic$readDeli3, 3);

							var content = _PluginBasic$readDeli4[0];
							var nestedLeft = _PluginBasic$readDeli4[1];
							var nestedRight = _PluginBasic$readDeli4[2];

							buffer += "\\left" + nestedLeft + content + "\\right" + nestedRight;
						} else if (macro === "right") {
							var right = parser.reader.next();
							return [buffer, left, right];
						} else {
							buffer += "\\" + macro;
						}
					} else {
						buffer += "\\";
					}
				} else {
					buffer += parser.reader.next();
				}
			}

			throw new TeXSyntaxError("Expecting \\right, got EOF");
		}

		// Return a character/macro implementation that simply prints the given static output.

	}, {
		key: "textMacro",
		value: function textMacro(text) {
			return function (parser) {
				var x = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

				parser.buffer += text;
			};
		}
	}, {
		key: "binaryMacro",
		value: function binaryMacro(text) {
			return function (parser) {
				var x = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

				if (parser.context.mathsMode === "compact") {
					parser.buffer += text;
				} else {
					parser.buffer += ' ' + text + ' ';
				}
			};
		}
	}, {
		key: "opMacro",
		value: function opMacro(text) {
			return function (parser) {
				var x = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

				parser.buffer += text;
				if (parser.reader.peek() !== "_" && parser.reader.peek() !== "^") {
					parser.buffer += ' ';
				}
			};
		}
	}, {
		key: "printDelimited",
		value: function printDelimited(parser, content, left, right) {
			var contentHeight = TeXParser.estimateMathsHeight(content, parser.context);
			var transform = '-webkit-transform: scale(1, ' + contentHeight + '); transform: scale(1, ' + contentHeight + ');';
			parser.buffer += '<span class="tex-delim" style="' + transform + '">' + left + '</span>';
			parser.buffer += TeXParser.parseString(content, parser.context);
			parser.buffer += '<span class="tex-delim" style="' + transform + '">' + right + '</span>';
			// Anki's QtWebView doesn't support unprefixed CSS transforms :(
		}
	}]);

	return PluginBasic;
}(Plugin);

var PluginChemistry = function (_Plugin2) {
	_inherits(PluginChemistry, _Plugin2);

	function PluginChemistry() {
		_classCallCheck(this, PluginChemistry);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(PluginChemistry).apply(this, arguments));
	}

	_createClass(PluginChemistry, [{
		key: "enable",
		value: function enable() {
			var _minus = this.parser.context.arch.MATHS_ACTIVES["-"] || function (parser, x) {
				this.parser.buffer += '-';
			};
			this.parser.context.arch.MATHS_ACTIVES["-"] = function (parser, char) {
				if (parser.context.mathsMode === "ce") {
					if (parser.accept(">")) {
						parser.buffer += ' ⟶ '; // It's actually an arrow in disguise
					} else {
						parser.buffer += '–'; // Single bond
					}
				} else {
					_minus(parser, char);
				}
			};

			var _equals = this.parser.context.arch.MATHS_ACTIVES["="] || function (parser, x) {
				this.parser.buffer += '=';
			};
			this.parser.context.arch.MATHS_ACTIVES["="] = function (parser, char) {
				if (parser.context.mathsMode === "ce") {
					parser.buffer += '='; // Double bond
				} else {
					_equals(parser, char);
				}
			};

			this.parser.context.arch.MATHS_ACTIVES["~"] = function (parser, char) {
				if (parser.context.mathsMode === "ce") {
					parser.buffer += '≡'; // Triple bond
				} else {
					parser.buffer += '~';
				}
			};

			this.parser.context.arch.MATHS_MACROS["ce"] = function (parser, macro) {
				parser.buffer += '<span class="tex-maths-upright">';

				var newContext = Object.create(parser.context);
				newContext.mathsMode = "ce";

				parser.buffer += TeXParser.parseString(parser.readMacroArgs(1)[0], newContext);
				parser.buffer += '</span>';
			};
		}
	}]);

	return PluginChemistry;
}(Plugin);

// Hey look, you also get a copy of my personal set of LaTeX helper-macros! What a bargain!


var PluginRunasSudo = function (_Plugin3) {
	_inherits(PluginRunasSudo, _Plugin3);

	function PluginRunasSudo() {
		_classCallCheck(this, PluginRunasSudo);

		return _possibleConstructorReturn(this, Object.getPrototypeOf(PluginRunasSudo).apply(this, arguments));
	}

	_createClass(PluginRunasSudo, [{
		key: "enable",
		value: function enable() {
			this.parser.context.arch.MATHS_UPRIGHTS += "Δ";
			this.parser.context.arch.MATHS_MACROS["uDelta"] = PluginBasic.textMacro('Δ');
			this.parser.context.arch.MATHS_MACROS["ue"] = PluginBasic.textMacro('e');
			this.parser.context.arch.MATHS_MACROS["ui"] = PluginBasic.textMacro('i');
			this.parser.context.arch.MATHS_MACROS["upi"] = PluginBasic.textMacro('π');

			this.parser.context.arch.MATHS_MACROS["br"] = function (parser, macro) {
				PluginBasic.printDelimited(parser, parser.readMacroArgs(1)[0], '(', ')');
			};
			this.parser.context.arch.MATHS_MACROS["sbr"] = function (parser, macro) {
				PluginBasic.printDelimited(parser, parser.readMacroArgs(1)[0], '[', ']');
			};
			this.parser.context.arch.MATHS_MACROS["cbr"] = function (parser, macro) {
				PluginBasic.printDelimited(parser, parser.readMacroArgs(1)[0], '{', '}');
			};
		}
	}]);

	return PluginRunasSudo;
}(Plugin);
