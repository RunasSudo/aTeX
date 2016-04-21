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

class Reader {
	mutate(context) {
		let reader = this;
		// Only process entities in maths mode
		reader = (context.mathsMode && context.parseEntities) ? reader.toHtmlAware() : reader.notHtmlAware();
		return reader;
	}
}

class StringReader extends Reader {
	constructor(string) {
		super()
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
		if (!this.hasNext()) {
			throw new TeXSyntaxError("Unexpected EOF");
		}
		return this.string[this.ptr];
	}
	
	next() {
		let result = this.peek();
		this.ptr++;
		return result;
	}
	
	toHtmlAware() {
		let reader = new HTMLAwareStringReader(this.string);
		reader.ptr = this.ptr;
		return reader;
	}
	notHtmlAware() {
		let reader = new StringReader(this.string);
		reader.ptr = this.ptr;
		return reader;
	}
}

class HTMLAwareStringReader extends StringReader {
	constructor(string) {
		super(string);
	}
	
	peekEntity() {
		let out = "";
		let entity = "";
		let ptr = this.ptr;
		while (ptr < this.string.length && (out = this.string[ptr++]) != ";") {
			entity += out;
		}
		return entity + ";";
	}
	
	peek() {
		if (!this.hasNext()) {
			throw new TeXSyntaxError("Unexpected EOF");
		}
		if (super.peek() === "&") {
			let entity = this.peekEntity();
			
			if (entity === "&nbsp;") {
				return " ";
			} else {
				let tmp = document.createElement("div");
				tmp.innerHTML = this.peekEntity();
				return tmp.textContent;
			}
		} else {
			return super.peek();
		}
	}
	
	next() {
		if (!this.hasNext()) {
			throw new TeXSyntaxError("Unexpected EOF");
		}
		if (super.peek() === "&") {
			let entity = this.peekEntity();
			this.ptr += entity.length;
			
			if (entity === "&nbsp;") {
				return " ";
			} else {
				let tmp = document.createElement("div");
				tmp.innerHTML = entity;
				return tmp.textContent;
			}
		}
		
		let result = this.peek();
		this.ptr++;
		return result;
	}
}
