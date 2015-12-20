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

// why u no class variables, JS?
let MATH_UPRIGHTS = "0-9 +×÷=><≥≤Δ∞%\(\)\?";
let MATH_ACTIVES = "\\^_";
let MATH_VARIABLES = "^#\\$&\\{\\}~\\\\" + MATH_UPRIGHTS + MATH_ACTIVES;

class TeXParser {
	static parseString(string, isMaths = false) {
		if (isMaths) {
			return new TeXParser(new StringReader(string)).parseMaths();
		} else {
			return new TeXParser(new StringReader(string)).parseTeX();
		}
	}
	
	constructor(reader, options) {
		this.reader = reader;
		this.buffer = "";
		
		this.options = {};
	}
	
	parseTeX() {
		try {
			while (this.reader.hasNext()) {
				if (this.parseDollarSign() || this.parseTextMacro() || this.parseText())
				{
				} else {
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
	parseMaths() {
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
	accept(regex, strict = false) {
		if (typeof(regex) === "string") {
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
	
	// Accept any character that does not enter maths mode.
	parseText() {
		let out;
		if (out = this.accept(/[^\$\\]/)) {
			this.buffer += out;
			return true;
		}
		return false;
	}
	
	parseTextMacro() {
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
	parseDollarSign() {
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
				this.parseMathsSymbol();
			}
		}
		
		throw new TeXSyntaxError("Expecting $, got EOF");
	}
	
	// Parse a "single" maths symbol.
	parseMathsSymbol() {
		let out;
		if (out = this.accept(RegExp("[" + MATH_UPRIGHTS + "]"))) {
			this.buffer += out;
		} else if (this.accept("-")) {
			this.buffer += '−';
		} else if (this.accept("_")) {
			this.buffer += '<sub>';
			this.parseMathsSymbol(); // Read a single character or the next group/macro/etc.
			this.buffer += '</sub>';
		} else if (this.accept("^")) {
			this.buffer += '<sup>';
			this.parseMathsSymbol();
			this.buffer += '</sup>';
		} else if (this.reader.peek() === "{") {
			this.buffer += TeXParser.parseString(this.parseGroup(), true);
		} else if (this.parseMacro()) {
		} else if (out = this.accept(RegExp("[" + MATH_VARIABLES + "]"))) {
			this.buffer += '<i class="tex-variable">' + out + '</i>';
		} else {
			throw new TeXSyntaxError("Unexpected " + this.reader.peek());
		}
		return true;
	}
	
	// Return the (mostly) unparsed content in the following group.
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
			this.buffer += TeXParser.parseString(args[0], true);
			this.buffer += '</div><div class="tex-frac-bar"></div><div class="tex-frac-den">';
			this.buffer += TeXParser.parseString(args[1], true);
			this.buffer += '</div></div>';
		} else if (macro === "text") {
			this.buffer += TeXParser.parseString(args[0]);
		} else if (macro === "overline") {
			this.buffer += '<span class="tex-overline">';
			this.buffer += TeXParser.parseString(args[0], true);
			this.buffer += '</span>';
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
}
