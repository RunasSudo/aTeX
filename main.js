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

class TeXSyntaxError extends Error {
	constructor(message) {
		super(message);
		this.name = "TeXSyntaxError";
		this.message = message;
	}
}

// why u no class variables, JS?
let MATHS_UPRIGHTS = "0-9%\\(\\)\\[\\]\\?Δ∞↑→↓←";
let MATHS_BINARIES = "+×÷=≈><≥≤";
let MATHS_ACTIVES = "\\^\\- _\\*'";
let MATHS_VARIABLES = "^#\\$&\\{\\}~\\\\" + MATHS_UPRIGHTS + MATHS_BINARIES + MATHS_ACTIVES;

let MATHS_MACROS_SYMB = {
	cos: 'cos ',
	uparrow: ' ↑ ',
	rightarrow: ' ⟶ ',
	downarrow: ' ↓ ',
	leftarrow: ' ← ',
	'in': '∈',
	sin: 'sin ',
	sum: '∑',
	tan: 'tan ',
	therefore: '∴ ',
	uDelta: 'Δ',
};
let MATHS_MACROS_BINARIES = {
	approx: '≈',
	propto: '∝',
	times: '×',
}

class TeXParser {
	static parseString(string, context = {}) {
		if (context.mathsMode) {
			return new TeXParser(new StringReader(string).mutate(context), context).parseMaths();
		} else {
			return new TeXParser(new StringReader(string).mutate(context), context).parseTeX();
		}
	}
	
	constructor(reader, context = {}) {
		this.reader = reader;
		this.buffer = "";
		
		this.context = Object.create(context);
		this.context.mathsMode = "mathsMode" in this.context ? this.context.mathsMode : false;
		this.context.mathsDisplayMode = "mathsDisplayMode" in this.context ? this.context.mathsDisplayMode : false;
		this.context.parseEntities = "parseEntities" in this.context ? this.context.parseEntities : false;
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
		if (this.reader.hasNext()) {
			if (typeof(regex) === "string") {
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
	parseMathsSymbol() {
		let out;
		if (out = this.accept(RegExp("[" + MATHS_UPRIGHTS + "]"))) {
			this.buffer += out;
		} else if (out = this.accept(RegExp("[" + MATHS_BINARIES + "]"))) {
			if (this.context.mathsMode === "compact") {
				this.buffer += out;
			} else {
				this.buffer += ' ' + out + ' ';
			}
		} else if (this.accept(" ")) {
		} else if (this.accept("-")) {
			if (this.context.mathsMode === "ce" && this.accept(">")) {
				this.buffer += ' ⟶ '; // It's actually an arrow in disguise
			} else {
				if (this.buffer.endsWith(" ")) { // Last input was probably an operator
					this.buffer += '−'; // Unary minus
				} else {
					this.buffer += ' − '; // Binary minus
				}
			}
		} else if (this.accept("*")) {
			this.buffer += '∗';
		} else if (this.accept("'")) {
			this.buffer += '′'
		} else if (out = this.accept(/[_\^]/)) {
			let newContext = Object.create(this.context);
			if (this.context.mathsMode === "ce")
				newContext.mathsMode = "compact"
			let parser = new TeXParser(this.reader, newContext);
			
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
		} else if (this.parseMacro()) {
		} else if (out = this.accept(RegExp("[" + MATHS_VARIABLES + "]"))) {
			this.buffer += '<i class="tex-variable">' + out + '</i>';
		} else {
			throw new TeXSyntaxError("Unexpected " + this.reader.peek());
		}
		return true;
	}
	
	// Return the (mostly) unparsed content in the following group.
	readGroup() {
		let buffer = "";
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
	
	unreadMacro(macro, starred, args) {
		let buffer = "";
		buffer += "\\" + macro + (starred ? "*" : "");
		for (let arg of args) {
			buffer += "{" + arg + "}";
		}
		return buffer;
	}
	
	parseMacro() {
		if (!this.accept("\\")) {
			return false;
		}
		
		let macro = this.readString(/[a-zA-Z]/);
		return this.handleMacro(macro);
	}
	
	readMacroArgs(num) {
		let args = [];
		for (let i = 0; i < num; i++) {
			while (this.accept(" ")); // Gobble whitespace.
			
			if (this.reader.peek() == "{") {
				args.push(this.readGroup());
			} else {
				args.push(this.reader.next());
			}
		}
		return args;
	}
	
	handleMacro(macro) {
		while (this.accept(" ")); // Gobble whitespace.
		
		// WARNING: The whitespace that follows is misleading!
		
		if (MATHS_MACROS_SYMB[macro]) {
			this.buffer += MATHS_MACROS_SYMB[macro];
		}
		else if (MATHS_MACROS_BINARIES[macro]) {
			if (this.context.mathsMode === "compact") {
				this.buffer += MATHS_MACROS_BINARIES[macro];
			} else {
				this.buffer += ' ' + MATHS_MACROS_BINARIES[macro] + ' ';
			}
		}
		
		else if (macro === "begin") {
			this.parseEnvironment(this.readMacroArgs(1)[0]);
		}
		else if (macro === "end") {
			throw new TeXSyntaxError("Unexpected \\end{" + this.readMacroArgs(1)[0] + "}");
		}
		
		else if (macro === "ce") {
			this.buffer += '<span class="tex-maths-upright">';
			
			let newContext = Object.create(this.context);
			newContext.mathsMode = "ce";
			
			this.buffer += TeXParser.parseString(this.readMacroArgs(1)[0], newContext);
			this.buffer += '</span>';
		}
		
		else if (macro === "frac") {
			let args = this.readMacroArgs(2);
			
			this.buffer += '<span class="tex-frac"><span class="tex-frac-num">';
			this.buffer += TeXParser.parseString(args[0], this.context);
			
			let denHeight = TeXParser.estimateMathsHeight(args[1], this.context);
			this.buffer += '</span><span class="tex-frac-bar"></span><span class="tex-frac-den" style="top: ' + (denHeight - 0.3) + 'em;">';
			
			this.buffer += TeXParser.parseString(args[1], this.context);
			this.buffer += '</span></span>';
		}
		
		else if (macro === "left") {
			let [content, left, right] = this.readDelimited();
			let contentHeight = TeXParser.estimateMathsHeight(content, this.context);
			let transform = '-webkit-transform: scale(1, ' + contentHeight + '); transform: scale(1, ' + contentHeight + ');';
			this.buffer += '<span class="tex-delim" style="' + transform + '">' + left + '</span>';
			this.buffer += TeXParser.parseString(content, this.context);
			this.buffer += '<span class="tex-delim" style="' + transform + '">' + right + '</span>';
			// Anki's QtWebView doesn't support unprefixed CSS transforms :(
		}
		else if (macro === "right") {
			throw new TeXSyntaxError("Unexpected \\right" + this.reader.next());
		}
		
		else if (macro === "log" || macro === "ln" || macro === "lg" || macro === "lb") {
			this.buffer += macro;
			if (this.reader.peek() !== "_") {
				this.buffer += ' ';
			}
		}
		
		else if (macro === "mathcal") {
			if (this.readMacroArgs(1)[0] === "E") {
				this.buffer += 'ℰ';
			}
		}
		
		else if (macro === "overline") {
			this.buffer += '<span class="tex-overline">';
			this.buffer += TeXParser.parseString(this.readMacroArgs(1)[0], this.context);
			this.buffer += '</span>';
		}
		
		else if (macro === "sqrt") {
			this.buffer += '<span class="tex-sqrt"><span>';
			this.buffer += TeXParser.parseString(this.readMacroArgs(1)[0], this.context);
			this.buffer += '</span></span>';
		}
		
		else if (macro === "symbf") {
			this.buffer += '<b class="tex-bold">';
			this.buffer += TeXParser.parseString(this.readMacroArgs(1)[0], this.context);
			this.buffer += '</b>';
		}
		
		else if (macro === "symup") {
			this.buffer += '<b class="tex-maths-upright">';
			this.buffer += TeXParser.parseString(this.readMacroArgs(1)[0], this.context);
			this.buffer += '</b>';
		}
		
		else if (macro === "text") {
			let newContext = Object.create(this.context);
			newContext.mathsMode = false;
			
			this.buffer += TeXParser.parseString(this.readMacroArgs(1)[0], newContext);
		}
		
		else {
			throw new TeXSyntaxError("Unknown macro " + macro);
		}
		
		return true;
	}
	
	// Return the (mostly) unparsed content in the following delimited thingo, plus the delimiters.
	readDelimited() {
		let buffer = "";
		let left = this.reader.next();
		
		// Go through characters, find nested delimited things and exit on un-nested \rightX
		while (this.reader.hasNext()) {
			if (this.accept("\\")) {
				if (this.reader.peek().match(/[a-zA-Z]/)) {
					let macro = this.readString(/[a-zA-Z]/);
					
					if (macro === "left") {
						let [content, nestedLeft, nestedRight] = this.readDelimited();
						buffer += "\\left" + nestedLeft + content + "\\right" + nestedRight;
					} else if (macro === "right") {
						let right = this.reader.next();
						return [buffer, left, right];
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
		
		throw new TeXSyntaxError("Expecting \\right, got EOF");
	}
	
	// Return the (mostly) unparsed content in the following environment.
	readEnvironment(name) {
		let buffer = "";
		
		// Go through characters, find nested environments and exit on un-nested \end{name}
		while (this.reader.hasNext()) {
			if (this.accept("\\")) {
				if (this.reader.peek().match(/[a-zA-Z]/)) {
					let macro = this.readString(/[a-zA-Z]/);
					
					if (macro === "begin") {
						let args = this.readMacroArgs(1);
						
						buffer += "\\begin{";
						buffer += args[0];
						buffer += "}";
						buffer += this.readEnvironment(args[0]);
						buffer += "\\end{" + args[0] + "}";
					} else if (macro === "end") {
						let args = this.readMacroArgs(1);
						
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
	
	parseEnvironment(name) {
		if (name === "align") {
			let newContext = Object.create(this.context);
			newContext.mathsMode = "display";
			newContext.parseEntities = false; // We have already processed any entities.
			
			let reader = new StringReader(this.readEnvironment(name)).mutate(newContext);
			
			let parser = new TeXParser(reader, newContext);
			
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
						let macro = parser.readString(/[a-zA-Z]/);
						parser.handleMacro(macro);
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
			
			this.buffer += '</span></div></div>' // col, row, tex-align
		}
		
		else {
			throw new TeXSyntaxError("Unknown environment " + name);
		}
	}
	
	// Estimate the height of the given maths-mode code in em's
	static estimateMathsHeight(code, context) {
		let height = 0;
		
		let reader = new StringReader(code).mutate(context);
		let parser = new TeXParser(reader, context);
		
		while (reader.hasNext()) {
			// Recurse through macros
			if (parser.accept("\\")) {
				if (reader.peek().match(/[a-zA-Z]/)) {
					let macro = parser.readString(/[a-zA-Z]/);
					
					if (macro === "frac") {
						let args = parser.readMacroArgs(2);
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
}
