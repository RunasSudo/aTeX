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

class Plugin {
	constructor(parser) {
		this.parser = parser;
	}
}

class PluginBasic extends Plugin {
	enable() {
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
		this.parser.context.arch.MATHS_MACROS["cos"] = PluginBasic.textMacro('cos ');
		this.parser.context.arch.MATHS_MACROS["uparrow"] = PluginBasic.textMacro(' ↑ ');
		this.parser.context.arch.MATHS_MACROS["downarrow"] = PluginBasic.textMacro(' ↓ ');
		this.parser.context.arch.MATHS_MACROS["leftarrow"] = PluginBasic.textMacro(' ← ');
		this.parser.context.arch.MATHS_MACROS["rightarrow"] = PluginBasic.textMacro(' → ');
		this.parser.context.arch.MATHS_MACROS["in"] = PluginBasic.textMacro('∈');
		this.parser.context.arch.MATHS_MACROS["parallel"] = PluginBasic.textMacro('∥');
		this.parser.context.arch.MATHS_MACROS["perp"] = PluginBasic.textMacro('⟂');
		this.parser.context.arch.MATHS_MACROS["propto"] = PluginBasic.binaryMacro('∝');
		this.parser.context.arch.MATHS_MACROS["sin"] = PluginBasic.textMacro('sin ');
		this.parser.context.arch.MATHS_MACROS["tan"] = PluginBasic.textMacro('tan ');
		this.parser.context.arch.MATHS_MACROS["therefore"] = PluginBasic.textMacro('∴ ');
		this.parser.context.arch.MATHS_MACROS["times"] = PluginBasic.binaryMacro('×');
		this.parser.context.arch.MATHS_MACROS["to"] = PluginBasic.binaryMacro('→');
		
		this.parser.context.arch.MATHS_ACTIVES["-"] = function(parser, char) {
			if (parser.buffer.endsWith(" ")) { // Last input was probably an operator
				parser.buffer += '−'; // Unary minus
			} else {
				parser.buffer += ' − '; // Binary minus
			}
		}
		
		this.parser.context.arch.MATHS_ACTIVES["^"] = function(parser, char) {
			let newContext = Object.create(parser.context);
			if (parser.context.mathsMode === "ce")
				newContext.mathsMode = "compact"
			let parser2 = new TeXParser(parser.reader, newContext);
			
			parser.buffer += '<span class="tex-subsup">';
			let out;
			do {
				parser.buffer += '<span class="' + (char === "_" ? 'sub' : 'sup') + '">';
				
				parser2.buffer = "";
				parser2.parseMathsSymbol(); // Read a single character or the next group/macro/etc.
				parser.buffer += parser2.buffer;
				
				parser.buffer += '</span>';
			} while (out = parser.accept(/[_\^]/)); // Too much recursion. Time for loops!
			parser.buffer += '</span>';
		}
		this.parser.context.arch.MATHS_ACTIVES["_"] = this.parser.context.arch.MATHS_ACTIVES["^"];
		
		this.parser.context.arch.MATHS_MACROS["frac"] = function(parser, macro) {
			let args = parser.readMacroArgs(2);
			
			parser.buffer += '<span class="tex-frac"><span class="tex-frac-num">';
			parser.buffer += TeXParser.parseString(args[0], parser.context);
			
			let denHeight = TeXParser.estimateMathsHeight(args[1], parser.context);
			parser.buffer += '</span><span class="tex-frac-bar"></span><span class="tex-frac-den" style="top: ' + (denHeight - 0.3) + 'em;">';
			
			parser.buffer += TeXParser.parseString(args[1], parser.context);
			parser.buffer += '</span></span>';
		}
		
		this.parser.context.arch.MATHS_MACROS["left"] = function(parser, macro) {
			let [content, left, right] = PluginBasic.readDelimited(parser);
			let contentHeight = TeXParser.estimateMathsHeight(content, parser.context);
			let transform = '-webkit-transform: scale(1, ' + contentHeight + '); transform: scale(1, ' + contentHeight + ');';
			parser.buffer += '<span class="tex-delim" style="' + transform + '">' + left + '</span>';
			parser.buffer += TeXParser.parseString(content, parser.context);
			parser.buffer += '<span class="tex-delim" style="' + transform + '">' + right + '</span>';
			// Anki's QtWebView doesn't support unprefixed CSS transforms :(
		}
		
		this.parser.context.arch.MATHS_MACROS["right"] = function(parser, macro) {
			throw new TeXSyntaxError("Unexpected \\right" + this.reader.next());
		}
		
		this.parser.context.arch.MATHS_MACROS["log"] = function(parser, macro) {
			parser.buffer += "log";
			if (parser.reader.peek() !== "_") {
				parser.buffer += ' ';
			}
		}
		this.parser.context.arch.MATHS_MACROS["ln"] = function(parser, macro) {
			parser.buffer += macro;
		}
		this.parser.context.arch.MATHS_MACROS["lg"] = this.parser.context.arch.MATHS_MACROS["ln"];
		this.parser.context.arch.MATHS_MACROS["lb"] = this.parser.context.arch.MATHS_MACROS["ln"];
		
		this.parser.context.arch.MATHS_MACROS["mathcal"] = function(parser, macro) {
			if (parser.readMacroArgs(1)[0] === "E") {
				parser.buffer += 'ℰ';
			}
			// TODO: Better
		}
		
		this.parser.context.arch.MATHS_MACROS["overline"] = function(parser, macro) {
			parser.buffer += '<span class="tex-overline">';
			parser.buffer += TeXParser.parseString(parser.readMacroArgs(1)[0], parser.context);
			parser.buffer += '</span>';
		}
		this.parser.context.arch.MATHS_MACROS["sqrt"] = function(parser, macro) {
			parser.buffer += '<span class="tex-sqrt"><span>';
			parser.buffer += TeXParser.parseString(parser.readMacroArgs(1)[0], parser.context);
			parser.buffer += '</span></span>';
		}
		this.parser.context.arch.MATHS_MACROS["symbf"] = function(parser, macro) {
			parser.buffer += '<b class="tex-bold">';
			parser.buffer += TeXParser.parseString(parser.readMacroArgs(1)[0], parser.context);
			parser.buffer += '</b>';
		}
		this.parser.context.arch.MATHS_MACROS["symup"] = function(parser, macro) {
			parser.buffer += '<span class="tex-maths-upright">';
			parser.buffer += TeXParser.parseString(parser.readMacroArgs(1)[0], parser.context);
			parser.buffer += '</span>';
		}
		
		this.parser.context.arch.MATHS_MACROS["sum"] = function(parser, macro) {
			parser.buffer += '<span class="tex-limit"><span class="tex-limit-mid" style="font-size: 1.5em; top: -0.4em;">∑</span class="tex-limit-mid">';
			
			let out;
			while (out = parser.accept(/[_\^]/)) {
				parser.buffer += '<span class="tex-limit-' + (out === "_" ? 'bot' : 'top') + '" style="top: ' + (out === "_" ? '1.4' : '-1.6') + 'em;">';
				parser.parseMathsSymbol();
				parser.buffer += '</span>';
			}
			
			parser.buffer += '</span>';
		}
		this.parser.context.arch.MATHS_MACROS["lim"] = function(parser, macro) {
			parser.buffer += '<span class="tex-limit"><span class="tex-limit-mid">lim</span class="tex-limit-mid">';
			
			let out;
			while (out = parser.accept(/[_\^]/)) {
				parser.buffer += '<span class="tex-limit-' + (out === "_" ? 'bot' : 'top') + '">';
				parser.parseMathsSymbol();
				parser.buffer += '</span>';
			}
			
			parser.buffer += '</span> ';
		}
		
		this.parser.context.arch.MATHS_MACROS["text"] = function(parser, macro) {
			let newContext = Object.create(parser.context);
			newContext.mathsMode = false;
			
			parser.buffer += TeXParser.parseString(parser.readMacroArgs(1)[0], newContext);
		}
		
		this.parser.context.arch.MATHS_ENVIRONMENTS["align"] = function(parser, env) {
			let newContext = Object.create(parser.context);
			newContext.mathsMode = "display";
			newContext.parseEntities = false; // We have already processed any entities.
			
			let reader = new StringReader(parser.readEnvironment(env)).mutate(newContext);
			
			let parser2 = new TeXParser(reader, newContext);
			
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
						let macro = parser2.readString(/[a-zA-Z]/);
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
			
			parser.buffer += '</span></div></div>' // col, row, tex-align
		}
	}
	
	// Return the (mostly) unparsed content in the following delimited thingo, plus the delimiters.
	static readDelimited(parser) {
		let buffer = "";
		let left = parser.reader.next();
		
		// Go through characters, find nested delimited things and exit on un-nested \rightX
		while (parser.reader.hasNext()) {
			if (parser.accept("\\")) {
				if (parser.reader.peek().match(/[a-zA-Z]/)) {
					let macro = parser.readString(/[a-zA-Z]/);
					
					if (macro === "left") {
						let [content, nestedLeft, nestedRight] = PluginBasic.readDelimited();
						buffer += "\\left" + nestedLeft + content + "\\right" + nestedRight;
					} else if (macro === "right") {
						let right = parser.reader.next();
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
	static textMacro(text) {
		return function(parser, x = false) {
			parser.buffer += text;
		}
	}
	
	static binaryMacro(text) {
		return function(parser, x = false) {
			if (parser.context.mathsMode === "compact") {
				parser.buffer += text;
			} else {
				parser.buffer += ' ' + text + ' ';
			}
		}
	}
}

class PluginChemistry extends Plugin {
	enable() {
		let _minus = this.parser.context.arch.MATHS_ACTIVES["-"] || function(nop){};
		this.parser.context.arch.MATHS_ACTIVES["-"] = function(parser, char) {
			if (parser.context.mathsMode === "ce") {
				if (parser.accept(">")) {
					parser.buffer += ' ⟶ '; // It's actually an arrow in disguise
				} else {
					parser.buffer += '–'; // Single bond
				}
			} else {
				_minus(parser, char);
			}
		}
		
		let _equals = this.parser.context.arch.MATHS_ACTIVES["="] || function(nop){};
		this.parser.context.arch.MATHS_ACTIVES["="] = function(parser, char) {
			if (parser.context.mathsMode === "ce") {
				parser.buffer += '='; // Double bond
			} else {
				_equals(parser, char);
			}
		}
		
		this.parser.context.arch.MATHS_ACTIVES["~"] = function(parser, char) {
			if (parser.context.mathsMode === "ce") {
				parser.buffer += '≡'; // Triple bond
			} else {
				parser.buffer += '~';
			}
		}
		
		this.parser.context.arch.MATHS_MACROS["ce"] = function(parser) {
			parser.buffer += '<span class="tex-maths-upright">';
			
			let newContext = Object.create(parser.context);
			newContext.mathsMode = "ce";
			
			parser.buffer += TeXParser.parseString(parser.readMacroArgs(1)[0], newContext);
			parser.buffer += '</span>';
		}
	}
}

// Hey look, you also get a copy of my personal set of LaTeX helper-macros! What a bargain!
class PluginRunasSudo extends Plugin {
	enable() {
		this.parser.context.arch.MATHS_UPRIGHTS += "Δ";
		this.parser.context.arch.MATHS_MACROS["uDelta"] = PluginBasic.textMacro('Δ');
	}
}
