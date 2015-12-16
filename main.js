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

class StringReader {
	constructor(string) {
		this.string = string;
		this.ptr = 0;
	}
	
	getPos() {
		return this.ptr;
	}
	
	hasNext() {
		return this.ptr < this.string.length;
	}
	
	peek() {
		if (this.ptr >= this.string.length) {
			return "EOF";
		}
		return this.string[this.ptr];
	}
	
	next() {
		if (this.ptr >= this.string.length) {
			return "EOF";
		}
		return this.string[this.ptr++];
	}
}

class TeXSyntaxError extends Error {
	constructor(message) {
		super(message);
		this.name = "TeXSyntaxError";
		this.message = message;
	}
}

class TeXParser {
	constructor(reader, options) {
		this.reader = reader;
		
		this.options = {};
		this.options.mathsOnly = (options.mathsOnly !== undefined ? options.mathsOnly : false); // Treat as TeX only in maths mode
	}
	
	parseTeX() {
		let buffer = "";
		try {
			while (this.reader.hasNext()) {
				let out;
				if (out = this.parseToplevelSymbol())
				{
					buffer += out;
				} else {
					throw new TeXSyntaxError("Unknown symbol " + this.reader.peek());
				}
			}
		} catch (ex) {
			buffer += '<span class="tex-error">' + ex.name + ': ' + ex.message + ' near ' + this.reader.getPos() + '</span>';
			console.log(ex.name + ": " + ex.message);
			console.log(ex.stack);
		}
		return buffer;
	}
	
	parseToplevelSymbol() {
		let out;
		if (this.options.mathsOnly) {
			out = (this.parseMaths() || this.parseAnything());
		} else {
			out = (this.parseMacro() || this.parseText());
		}
		return out;
	}
	
	escapeRegex(regex) {
		if (typeof(regex) === "string") {
			return RegExp(regex.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"));
		} else {
			return regex;
		}
	}
	
	accept(regex, strict = false) {
		if (this.reader.peek().match(this.escapeRegex(regex))) {
			return this.reader.next();
		} else {
			if (strict) {
				throw new TeXSyntaxError("Expecting " + regex + ", got " + this.reader.peek());
			}
		}
	}
	
	readString(regex) {
		let buffer = "";
		if (!this.reader.peek().match(regex)) {
			throw new TeXSyntaxError("Expecting " + regex + ", got " + this.reader.peek());
		}
		
		while (this.reader.hasNext() && this.reader.peek().match(regex)) {
			buffer += this.reader.next();
		}
		
		return buffer;
	}
	
	parseAnything() {
		let out;
		if ((out = this.accept(/[^\$]/))) {
			return out;
		}
	}
	
	parseText() {
		let out;
		if ((out = this.accept(/[^#\$%\^&_\{\}~\\]/))) {
			return out;
		}
	}
	
	parseGroup() {
		let buffer = "";
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
	
	parseMaths() {
		let buffer = "";
		if (!this.accept("$")) {
			return false;
		}
		
		while (this.reader.hasNext()) {
			if (this.accept("$")) {
				return buffer;
			} else {
				// Do mathemagics
				let out;
				if (out = this.accept(/[0-9 +×÷=]/)) {
					buffer += out;
				} else if (out = this.accept("-")) {
					buffer += '&minus;';
				} else if (out = this.parseMacro()) {
					buffer += out;
				} else if (this.reader.peek().match(/[^#\$%\^&_\{\}~\\0-9 +×÷=]/)) {
					buffer += '<span class="tex-variable">' + this.readString(/[^#\$%\^&_\{\}~\\0-9 +×÷=]/) + '</span>';
				} else {
					throw new TeXSyntaxError("Unknown symbol " + this.reader.peek());
				}
			}
		}
		
		throw new TeXSyntaxError("Expecting $, got EOF");
	}
	
	parseMacro() {
		if (!this.accept("\\")) {
			return false;
		}
		
		let macro = this.readString(/[a-zA-Z]/);
		let starred = this.accept("*");
		let args = [];
		while (this.reader.peek() === "{") {
			args.push(this.parseGroup());
		}
		return "MACRO " + macro + "," + args; //TODO
	}
}
