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
		this.context.arch = "arch" in this.context ? this.context.arch : {
			MATHS_UPRIGHTS: "",
			MATHS_ACTIVES: {},
			MATHS_MACROS: {},
			MATHS_ENVIRONMENTS: {},
		};
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
			console.log(this);
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
			console.log(this);
		}
		return this.buffer;
	}
	
	static toRegex(chars, negate = false) {
		if (chars[0] === "^") {
			chars = chars.replace("^", "") + "^"; // To include a literal ^, put it anywhere but first.
		}
		if (chars.includes("-")) {
			chars = chars.replace("-", "") + "-"; // To include a literal -, put it last.
		}
		return RegExp("[" + (negate ? "^" : "") + chars + "]");
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
		if (out = this.accept(TeXParser.toRegex(this.context.arch.MATHS_UPRIGHTS))) {
			this.buffer += out;
		} else if (this.accept(" ")) {
		} else if (out = this.accept(TeXParser.toRegex(Object.keys(this.context.arch.MATHS_ACTIVES).join("")))) {
			this.context.arch.MATHS_ACTIVES[out](this, out);
		} else if (this.reader.peek() === "{") {
			this.buffer += TeXParser.parseString(this.readGroup(), this.context);
		} else if (this.parseMacro()) {
		} else if (out = this.accept(TeXParser.toRegex("#\\$&\\{\\}~\\\\" + this.context.arch.MATHS_UPRIGHTS + Object.keys(this.context.arch.MATHS_ACTIVES).join(""), true))) {
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
		//while (this.accept(" ")); // Gobble whitespace.
		
		if (this.context.arch.MATHS_MACROS[macro]) {
			this.context.arch.MATHS_MACROS[macro](this, macro);
		} else if (macro === "begin") {
			let env = this.readMacroArgs(1)[0];
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
