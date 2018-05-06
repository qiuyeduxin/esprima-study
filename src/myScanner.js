import Character from './myCharacter.js';
import Messages from './myMessages.js';
let character = new Character();
function assert(condition, message) {
    /* istanbul ignore if */
    if (!condition) {
        throw new Error('ASSERT: ' + message);
    }
}
function hexValue (ch) {
    return '0123456789abcdef'.indexOf(ch.toLowerCase());
}
function octalValue (ch) {
    return '01234567'.indexOf(ch);
}
export default class Scanner {
	constructor (code, handler) {
		this.source = code;
		this.trackComment = false;
		this.length = code.length;
        this.index = 0;
        // 行数
        this.lineNumber = (this.length > 0) ? 1 : 0;
        // 行代码起点
        this.lineStart = 0;
        this.curlyStack = [];

        this.errorHandler = handler;
	}
	eof () {
		return this.index >= this.length;
	}
	throwUnexpectedToken (message) {
        if (message === void 0) { message = Messages.UnexpectedTokenIllegal; }
        return this.errorHandler.throwError(this.index, this.lineNumber, this.index - this.lineStart + 1, message);
    };
    tolerateUnexpectedToken (message) {
        if (message === void 0) { message = Messages.UnexpectedTokenIllegal; }
        this.errorHandler.tolerateError(this.index, this.lineNumber, this.index - this.lineStart + 1, message);
    };
    isKeyword (id) {
        switch (id.length) {
            case 2:
                return (id === 'if') || (id === 'in') || (id === 'do');
            case 3:
                return (id === 'var') || (id === 'for') || (id === 'new') ||
                    (id === 'try') || (id === 'let');
            case 4:
                return (id === 'this') || (id === 'else') || (id === 'case') ||
                    (id === 'void') || (id === 'with') || (id === 'enum');
            case 5:
                return (id === 'while') || (id === 'break') || (id === 'catch') ||
                    (id === 'throw') || (id === 'const') || (id === 'yield') ||
                    (id === 'class') || (id === 'super');
            case 6:
                return (id === 'return') || (id === 'typeof') || (id === 'delete') ||
                    (id === 'switch') || (id === 'export') || (id === 'import');
            case 7:
                return (id === 'default') || (id === 'finally') || (id === 'extends');
            case 8:
                return (id === 'function') || (id === 'continue') || (id === 'debugger');
            case 10:
                return (id === 'instanceof');
            default:
                return false;
        }
    }
    // 未来保留词语
    isFutureReservedWord (id) {
        switch (id) {
            case 'enum':
            case 'export':
            case 'import':
            case 'super':
                return true;
            default:
                return false;
        }
    }
    // 严格模式保留词语
    isStrictModeReservedWord (id) {
        switch (id) {
            case 'implements':
            case 'interface':
            case 'package':
            case 'private':
            case 'protected':
            case 'public':
            case 'static':
            case 'yield':
            case 'let':
                return true;
            default:
                return false;
        }
    }
    // 限制词
    isRestrictedWord (id) {
        return id === 'eval' || id === 'arguments';
    }
	scanComments () {
		let comments;
        if (this.trackComment) {
            comments = [];
        }
        let start = (this.index === 0);
        while(!this.eof()) {
        	let ch = this.source.charCodeAt(this.index);
        	if (character.isWhiteSpace(ch)) {
        		++this.index;
        	} else if (character.isLineTerminator(ch)) {
        		++this.index;
        		if (ch === 0x0D && this.source.charCodeAt(this.index) === 0x0A) {
        			++this.index;
        		}
        		++this.lineNumber;
        		this.lineStart = this.index;
        		start = true;
        	} else if (ch === 0x2F) {
        		ch = this.source.charCodeAt(this.index + 1);
        		// 双斜杆 单行注释
        		if (ch === 0x2F) {
        			this.index += 2;
        			let comment = this.skipSingleLineComment(2);
        			if (this.trackComment) {
        				comments = comments.concat(comment);
        			}
        			start = true;
        		} 
        		// /* */ 块注释
        		else if (ch === 0x2A) {
        			this.index += 2;
        			let comment = this.skipMulteLineComment(2);
        			if (this.trackComment) {
        				comments = comments.concat(comment);
        			}
        		}
        		else {
        			break;
        		}
        	}
        	// --> 单行注释 
        	else if (start && ch === 0x2D) {
        		if ((this.source.charCodeAt(this.index + 1) === 0x2D) && (this.source.charCodeAt(this.index + 2) === 0x3E)) {
        			this.index += 3;
        			let comment = this.skipSingleLineComment(3);
        			if (this.trackComment) {
        				comments = comments.concat(comment);
        			}
        		}
        	} else if (ch === 0x3C) {
        		if(this.source.slice(this.index + 1, this.index + 4) === '!--') {
        			this.index += 4;
        			let comment = this.skipSingleLineComment(4);
        			if (this.trackComment) {
        				comments = comments.concat(comment);
        			}
        		}
        	} else {
        		break;
        	}
        }
        return comments;
	}
	skipSingleLineComment (offset) {
		let comments = [];
		let loc, start;
		if (this.trackComment) {
			start = this.index - offset;
			loc = {
				start: {
					line: this.lineNumber,
					column: this.index - this.lineStart - offset // 注释内容为 双斜杆 后面开始算起 所以还要减去 offset 
				},
				end: {}
			};
		}
		while(!this.eof()) {
			let ch = this.source.charCodeAt(this.index);
			++this.index;
        	if (character.isLineTerminator(ch)) {
        		if (this.trackComment) {
					loc.end = {
						line: this.lineNumber,
						column: this.index - this.lineStart - 1 //为啥要减去1 是因为上面 index++
					};
					let entry = {
						multiLine: false,
						slice: [start + offset, this.index - 1], // 注释内容区
						range: [start, this.index - 1],          // 注释区（包括内容）
						loc: loc
					};
					comments.push(entry);
				}
        		if (ch === 0x0D && this.source.charCodeAt(this.index) === 0x0A) {
        			++this.index;
        		}
        		++this.lineNumber;
        		this.lineStart = this.index;
        		return comments;
        	}
		}
		if (this.trackComment) {
            loc.end = {
                line: this.lineNumber,
                column: this.index - this.lineStart
            };
            let entry = {
                multiLine: false,
                slice: [start + offset, this.index],
                range: [start, this.index],
                loc: loc
            };
            comments.push(entry);
        }

		return comments;
	}
	skipMulteLineComment () {
		let comments = [];
		let loc, start;
		if (this.trackComment) {
			start = this.index - 2;
			loc = {
				start: {
					line: this.lineNumber,
					column: this.index - this.lineStart - 2 // 注释内容为 /* 后面开始算起 所以还要减去 2 
				},
				end: {}
			};
		}
		while(!this.eof()) {
			let ch = this.source.charCodeAt(this.index);
        	if (character.isLineTerminator(ch)) {
        		++this.index;
        		if (ch === 0x0D && this.source.charCodeAt(this.index) === 0x0A) {
        			++this.index;
        		}
        		++this.lineNumber;
        		this.lineStart = this.index;
        	} else if (ch === 0x2A) {
        		// ends with '*/'
        		if (this.source.charCodeAt(this.index + 1) === 0x2F) {
        			this.index += 2;
        			if (this.trackComment) {
                        loc.end = {
                            line: this.lineNumber,
                            column: this.index - this.lineStart
                        };
                        let entry = {
                            multiLine: true,
                            slice: [start + 2, this.index - 2],
                            range: [start, this.index],
                            loc: loc
                        };
                        comments.push(entry);
                    }
                    return comments;
        		}
        		++this.index;
        	} else {
        		++this.index;
        	}
		}
		if (this.trackComment) {
            loc.end = {
                line: this.lineNumber,
                column: this.index - this.lineStart
            };
            let entry = {
                multiLine: false,
                slice: [start + 2, this.index],
                range: [start, this.index],
                loc: loc
            };
            comments.push(entry);
        }

		return comments;
		return comments;
	}
	scanRegExp () {
        // 比如 /[0-9]/g
		let start = this.index;
        // pattern = [0-9]
        let pattern = this.scanRegExpBody();
        // flags = g
        let flags = this.scanRegExpFlags();
        let value = this.testRegExp(pattern, flags);
        return {
            type: 9 /* RegularExpression */,
            value: '',
            pattern: pattern,
            flags: flags,
            regex: value,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
	}
	scanRegExpBody () {
        let ch = this.source[this.index];
        assert(ch ==='/', 'Regular expression literal must start with a slash');
        let str = this.source[this.index++];
        // 类型标记
        let classMarker = false;
        // 结束标志
        let terminated = false;
        while (!this.eof()) {
            ch = this.source[this.index++];
            str += ch;
            if (ch === '\\') {
                ch = this.source[this.index++];
                // /\\\n\\u\{([0-9a-fA-F]+)\}|\\u([a-fA-F0-9]{4})/g
                if (character.isLineTerminator(ch.charCodeAt(0))) {
                    this.throwUnexpectedToken(Messages.UnterminatedRegExp);
                }
                str += ch;
            }
            //  /\\n\\u\{([0-9a-fA-F]+)\}|\\u([a-fA-F0-9]{4})/g 
            else if (character.isLineTerminator(ch.charCodeAt(0))) {
                this.throwUnexpectedToken(Messages.UnterminatedRegExp);
            } else if (classMarker) {
                if (ch === ']') {
                    classMarker = false;
                }
            } else {
                if (ch === '/') {
                    terminated = true;
                    break;
                }
                else if (ch === '[') {
                    classMarker = true;
                }
            }
        }
        return str.substr(1, str.length - 2);

    }
	scanRegExpFlags () {
        let str = '';
        let flags = '';
        while (!this.eof()) {
            let ch = this.source[this.index];
            if (!character.isIdentifierStart(ch.charCodeAt(0))) {
                break;
            }
            ++this.index;
            if (ch === '\\' && !this.eof()) {
                ch = this.source[this.index];
                if (ch === 'u') {
                    //  pattern = /^[0-g]$/\\u0067
                    ++this.index;
                    let restore = this.index;
                    let char = this.scanHexEscape('u');
                    // \u0067 = g. char = g
                    if (char !== null) {
                        flags += char;
                        for (str += '\\u'; restore < this.index; ++restore) {
                            str += this.source[restore];
                        }
                    } else {
                        this.index = restore;
                        flags += 'u';
                        str += '\\u';
                    }
                    this.tolerateUnexpectedToken();
                } else {
                    //  pattern = /^[0-g]$/\\g
                    str += '\\';
                    this.tolerateUnexpectedToken();
                }
            } else {
                str += ch;
                flags += ch;
            }
        }
        return flags;
    }
	testRegExp (pattern, flags) {
        /* 
            当将ES6“U”-标记模式转换为ES5兼容近似时，用作替换星体符号的BMP字符。
            用“UFFFF”替换在未知的情况下会有问题。例如，'[u{104ff}-\u{}{ 10440 } ]是一个无效的模式，这种替换不会被检测到。
        */
        // 星体替代符
        let astralSubstitute = '\uFFFF';
        let tmp = pattern;
        let self = this;
        if (flags.indexOf('u') >= 0) {
            // 例如 匹配微笑 /\\ud83d\\ude03/u  😄
            tmp = tmp
                .replace(/\\u\{([0-9a-fA-F]+)\}|\\u([a-fA-F0-9]{4})/g, function ($0, $1, $2) {
                let codePoint = parseInt($1 || $2, 16);
                if (codePoint > 0x10FFFF) {
                    self.throwUnexpectedToken(Messages.InvalidRegExp);
                }
                if (codePoint <= 0xFFFF) {
                    return String.fromCharCode(codePoint);
                }
                return astralSubstitute;
            })
                .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, astralSubstitute);
        }
        // First, detect invalid regular expressions.
        try {
            RegExp(tmp);
        }
        catch (e) {
            this.throwUnexpectedToken(Messages.InvalidRegExp);
        }
        // Return a regular expression object for this pattern-flag pair, or
        // `null` in case the current environment doesn't support the flags it
        // uses.
        try {
            return new RegExp(pattern, flags);
        }
        catch (exception) {
            /* istanbul ignore next */
            return null;
        }
    }
	lex () {
		if (this.eof()) {
            // EOF是一个计算机术语，为End Of File的缩写，在操作系统中表示资料源无更多的资料可读取。资料源通常称为档案或串流。通常在文本的最后存在此字符表示资料结束。
			return {
				type: 2, // EOF
				value: '',
				lineNumber: this.lineNumber,
				lineStart: this.lineStart,
				start: this.index,
				end: this.index
			};
		}
		let cp = this.source.charCodeAt(this.index);
		if (character.isIdentifierStart(cp)) {
			return this.scanIdentifier();
		}
		// 0x28 0x29 -> () , 0x3B -> ; // 为了尽早结束，避免下面一堆判断最终还是走到scanPunctuator()函数里
		if (cp === 0x28 || cp === 0x29 || cp === 0x3B) {
			return this.scanPunctuator();
		}
		// 0x27 代表' , 0x22 代表"
		if (cp === 0x27 || cp === 0x22) {
			return this.scanStringLiteral();
		}
		// 0x2E 小数点
		if (cp === 0x2E) {
			if (character.isDecimalDigit(this.source.charCodeAt(this.index + 1))) {
                return this.scanNumericLiteral();
            }
            return this.scanPunctuator();
		}
		if (character.isDecimalDigit(cp)) {
			return this.scanNumericLiteral();
		}
		// es6 字符串模版。`${}`       0x60 `,0x7D }, 作者这里巧妙的运用了数组来存储模板变量开始的标志，这样就可以继续扫描变量后的模版符号
		if (cp === 0x60 || (cp === 0x7D && this.curlyStack[this.curlyStack.length - 1] === '${')) {
            return this.scanTemplate();
		}
		// 0xD800 55296, 0xDFFF 57343
		if (cp >= 0xD800 && cp < 0xDFFF) {
            if (character.isIdentifierStart(this.codePointAt(this.index))) {
                return this.scanIdentifier();
            }
        }
        return this.scanPunctuator();
	}
	// 标识符
	scanIdentifier () {
		let type;
		let start = this.index;
		let id = (this.source.charCodeAt(start) === 0x5C) ? this.getComplexIdentifier() : this.getIdentifier();
		if (id.length === 1) {
            type = 3 /* Identifier */;
        }
        else if (this.isKeyword(id)) {
            type = 4 /* Keyword */;
        }
        else if (id === 'null') {
            type = 5 /* NullLiteral */;
        }
        else if (id === 'true' || id === 'false') {
            type = 1 /* BooleanLiteral */;
        }
        else {
            type = 3 /* Identifier */;
        }
        if (type !== 3 /* Identifier */ && (start + id.length !== this.index)) {
            let restore = this.index;
            this.index = start;
            this.tolerateUnexpectedToken(Messages.InvalidEscapedReservedWord);
            this.index = restore;
        }
        return {
            type: type,
            value: id,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };

	}
	// 组合标识
	getComplexIdentifier () {
        let start = this.index;
		let cp = this.codePointAt(this.index);
		let id = character.fromCodePoint(cp);
		this.index += id.length;
		let ch;
		// 处理 \u+ 表示转义字符。
		if (cp === 0x5C) {
            let a = this.source.charCodeAt(this.index);
			if (this.source.charCodeAt(this.index) !== 0x75) {
                this.throwUnexpectedToken();
            }
            ++this.index;
            if (this.source[this.index] === '{') {
                ++this.index;
                ch = this.scanUnicodeCodePointEscape();
            }
            else {
                ch = this.scanHexEscape('u');
                if (ch === null || ch === '\\' || !character.isIdentifierStart(ch.charCodeAt(0))) {
                    this.throwUnexpectedToken();
                }
            }
            id = ch;
		}
		while (!this.eof()) {
            cp = this.codePointAt(this.index);
            if (!character.isIdentifierPart(cp)) {
                break;
            }
            ch = character.fromCodePoint(cp);
            id += ch;
            this.index += ch.length;
            // '\u' (U+005C, U+0075) denotes an escaped character. 转义字符
            if (cp === 0x5C) {
                id = id.substr(0, id.length - 1);
                if (this.source.charCodeAt(this.index) !== 0x75) {
                    this.throwUnexpectedToken();
                }
                ++this.index;
                if (this.source[this.index] === '{') {
                    ++this.index;
                    ch = this.scanUnicodeCodePointEscape();
                }
                else {
                    ch = this.scanHexEscape('u');
                    if (ch === null || ch === '\\' || !character.isIdentifierPart(ch.charCodeAt(0))) {
                        this.throwUnexpectedToken();
                    }
                }
                id += ch;
            }
        }
        return id;

	}
	scanUnicodeCodePointEscape () {
        let ch = this.source[this.index];
        let code = 0;
        // At least, one hex digit is required.
        if (ch === '}') {
            this.throwUnexpectedToken();
        }
        while (!this.eof()) {
            ch = this.source[this.index++];
            if (!character.isHexDigit(ch.charCodeAt(0))) {
                break;
            }
            code = code * 16 + hexValue(ch);
        }
        if (code > 0x10FFFF || ch !== '}') {
            this.throwUnexpectedToken();
        }
        return character.fromCodePoint(code);
    }
    // 十六进制转换字符 比如 \u 0067 转换成字符 g
    scanHexEscape (prefix) {
    	let len = (prefix === 'u') ? 4 : 2;
        let code = 0;
        for (let i = 0; i < len; ++i) {
            if (!this.eof() && character.isHexDigit(this.source.charCodeAt(this.index))) {
                code = code * 16 + hexValue(this.source[this.index++]);
            }
            else {
                return null;
            }
        }
        return String.fromCharCode(code);
    }
	// 获取标识
	getIdentifier () {
		let start = this.index++; // start = index; index++;
		while (!this.eof()) {
			let ch = this.source.charCodeAt(this.index);
			if(ch === 0x5C) {
				// Unicode 转义序列
				this.index = start;
				return this.getComplexIdentifier();
			}
			// https://en.wikipedia.org/wiki/Unicode
			// surrogate pairs UTF16编码代理对 （对于一个UTF16编码改用两个UTF16编码来代替）
			// 为何需要surrogate pairs？本来一个字符用一个UTF16编码（两个字节）来表示即可，但是由于需要被编码的字符越来越多，只用一个UTF16编码已经不足于表示所有的字符。因此，就需要考虑使用2个UTF16来表示一个字符（四个字节）。但是如果对于所有的字符都这样编码的话，太浪费空间了（原来只需要2个字节，现在都改用4个字节），所以规定，只有使用两个一定范围内的UTF16编码才被认为是一组surrogate pairs，其一起用来表示一个字符，对于其余的情形还是用一个UTF16来表示一个字符。
			/* UCS-2为每个字符使用两个字节（16位），但只能编码前65,536个编码点，即所谓的基本多语言平面（BMP）。在17个平面上有1,114,112个码点是可能的，并且迄今为止已定义了超过137,000个码点，因此许多Unicode字符是UCS-2无法实现的。因此，UCS-2已经过时，尽管在软件中仍然被广泛使用。UTF-16扩展UCS-2，使用与基本多语言平面相同的16位编码UCS-2，以及其他平面的4字节编码。只要它在保留范围U + 0D800-U + 0DFFF中不包含代码点，UCS-2文本就是一个有效的UTF-16文本。
               UTF-32（也称为UCS-4）为每个字符使用四个字节。像UCS-2一样，每个字符的字节数是固定的，有利于字符索引; 但与UCS-2不同，UTF-32能够编码所有的Unicode代码点。但是，由于每个字符使用四个字节，因此UTF-32比其他编码占用的空间大得多，并且没有被广泛使用。
             */

            // 在U + D800-U + DBFF（1024个码点）范围内的码点被称为高代理码点，并且在范围U + DC00-U + DFFF（1,024个码点）中的码点被称为低代用品代码点。高代理码点后跟低代理码点形成UTF-16中的代理对，以表示大于U + FFFF的代码点。这些代码点不能使用（这个规则在实践中经常被忽略，特别是当不使用UTF-16时）。
            // 比如iPhone中的微笑表情 编码就是D83D-DE03 即 0x1F603
            // https://blog.csdn.net/hherima/article/details/38961575 其实在第0个平面中，专门有一个代理区域，不表示任何字符，只用于指向第1到第16个平面中的字符，这段区域是：D800——DFFF.。其中0xD800——0xDBFF是前导代理(lead surrogates).0xDC00——0xDFFF是后尾代理(trail surrogates).
			else if (ch >= 0xD800 && ch < 0xDFFF) {
				this.index = start;
                return this.getComplexIdentifier();
			}
			if (character.isIdentifierPart(ch)) {
				++this.index;
			} else {
				break;
			}
		}
		return this.source.slice(start, this.index);

	}
	codePointAt (i) {
        let cp = this.source.charCodeAt(i);
        if (cp >= 0xD800 && cp <= 0xDBFF) {
            let second = this.source.charCodeAt(i + 1);
            if (second >= 0xDC00 && second <= 0xDFFF) {
                let first = cp;
                // 具体的公式是：0x10000 + (前导-0xD800) * 0x400 + (后导-0xDC00) = utf-16编码。
                cp = (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
            }
        }
        return cp;
    }
	// 操作符
	scanPunctuator () {
		let start = this.index;
		let str = this.source[this.index];
		switch (str) {
			case '(':
			case '{':
				if (str === '{') {
					this.curlyStack.push('{');
				}
				++this.index;
				break;
			case '.':
				++this.index;
				if (this.source[this.index] === '.' && this.source[this.index + 1] === '.') {
					this.index += 2;
					str = '...';
				}
				break;
			case '}':
                ++this.index;
                this.curlyStack.pop();
                break;
            case ')':
            case ';':
            case ',':
            case '[':
            case ']':
            case ':':
            case '?':
            case '~':
                ++this.index;
                break;
            default: 
                str = this.source.substr(this.index, 4);
                if (str === '>>>=') {
                    this.index += 4;
                }
                else {
                    // 3-character punctuators.
                    str = str.substr(0, 3);
                    if (str === '===' || str === '!==' || str === '>>>' ||
                        str === '<<=' || str === '>>=' || str === '**=') {
                        this.index += 3;
                    }
                    else {
                        // 2-character punctuators.
                        str = str.substr(0, 2);
                        if (str === '&&' || str === '||' || str === '==' || str === '!=' ||
                            str === '+=' || str === '-=' || str === '*=' || str === '/=' ||
                            str === '++' || str === '--' || str === '<<' || str === '>>' ||
                            str === '&=' || str === '|=' || str === '^=' || str === '%=' ||
                            str === '<=' || str === '>=' || str === '=>' || str === '**') {
                            this.index += 2;
                        }
                        else {
                            // 1-character punctuators.
                            str = this.source[this.index];
                            if ('<>=!+-*%&|^/'.indexOf(str) >= 0) {
                                ++this.index;
                            }
                        }
                    }
                }
		}
		if (this.index === start) {
            this.throwUnexpectedToken();
        }
        return {
            type: 7 /* Punctuator */,
            value: str,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
	}
	// 字符串
	scanStringLiteral () {
		let start = this.index;
        let quote = this.source[start];
        assert((quote === '\'' || quote === '"'), 'String literal must starts with a quote');
        ++this.index;
        let octal = false;
        let str = '';
        while (!this.eof()) {
            let ch = this.source[this.index++];
            if (ch === quote) {
                quote = '';
                break;
            }
            else if (ch === '\\') {
                ch = this.source[this.index++];
                if (!ch || !character.isLineTerminator(ch.charCodeAt(0))) {
                    switch (ch) {
                        case 'u':
                            if (this.source[this.index] === '{') {
                                ++this.index;
                                str += this.scanUnicodeCodePointEscape();
                            }
                            else {
                                let unescaped_1 = this.scanHexEscape(ch);
                                if (unescaped_1 === null) {
                                    this.throwUnexpectedToken();
                                }
                                str += unescaped_1;
                            }
                            break;
                        case 'x':
                            let unescaped = this.scanHexEscape(ch);
                            if (unescaped === null) {
                                this.throwUnexpectedToken();
                            }
                            str += unescaped;
                            break;
                        case 'n':
                            str += '\n';
                            break;
                        case 'r':
                            str += '\r';
                            break;
                        case 't':
                            str += '\t';
                            break;
                        case 'b':
                            str += '\b';
                            break;
                        case 'f':
                            str += '\f';
                            break;
                        case 'v':
                            str += '\x0B';
                            break;
                        case '8':
                        case '9':
                            str += ch;
                            break;
                        default:
                            if (ch && character.isOctalDigit(ch.charCodeAt(0))) {
                                let octToDec = this.octalToDecimal(ch);
                                octal = octToDec.octal || octal;
                                str += String.fromCharCode(octToDec.code);
                            }
                            else {
                                str += ch;
                            }
                            break;
                    }
                }
                else {
                    ++this.lineNumber;
                    if (ch === '\r' && this.source[this.index] === '\n') {
                        ++this.index;
                    }
                    this.lineStart = this.index;
                }
            }
            else if (character.isLineTerminator(ch.charCodeAt(0))) {
                break;
            }
            else {
                str += ch;
            }
        }
        if (quote !== '') {
            this.index = start;
            this.throwUnexpectedToken();
        }
        return {
            type: 8 /* StringLiteral */,
            value: str,
            octal: octal,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
	}
	octalToDecimal (ch) {
		let octal = (ch !== '0');
        let code = octalValue(ch);
        if (!this.eof() && character.isOctalDigit(this.source.charCodeAt(this.index))) {
            octal = true;
            code = code * 8 + octalValue(this.source[this.index++]);
            // 3 digits are only allowed when string starts
            // with 0, 1, 2, 3
            if ('0123'.indexOf(ch) >= 0 && !this.eof() && character.isOctalDigit(this.source.charCodeAt(this.index))) {
                code = code * 8 + octalValue(this.source[this.index++]);
            }
        }
        return {
            code: code,
            octal: octal
        };
	}
    scanHexLiteral (start) {
        let num = '';
        while (!this.eof()) {
            if (!character.isHexDigit(this.source.charCodeAt(this.index))) {
                break;
            }
            num += this.source[this.index++];
        }
        if (num.length === 0) {
            this.throwUnexpectedToken();
        }
        // 例如 0x0067gg 会抛出异常
        if (character.isIdentifierStart(this.source.charCodeAt(this.index))) {
            this.throwUnexpectedToken();
        }
        return {
            type: 6 /* NumericLiteral */,
            value: parseInt('0x' + num, 16),
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }
    scanBinaryLiteral (start) {
        let num = '';
        let ch;
        while (!this.eof()) {
            ch = this.source[this.index];
            if (ch !== '0' && ch !== '1') {
                break;
            }
            num += this.source[this.index++];
        }
        if (num.length === 0) {
            // only 0b or 0B
            this.throwUnexpectedToken();
        }
        if (!this.eof()) {
            ch = this.source.charCodeAt(this.index);
            /* istanbul ignore else */
            if (character.isIdentifierStart(ch) || character.isDecimalDigit(ch)) {
                this.throwUnexpectedToken();
            }
        }
        return {
            type: 6 /* NumericLiteral */,
            value: parseInt(num, 2),
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }
    scanOctalLiteral (prefix, start) {
        let num = '';
        let octal = false;
        if (character.isOctalDigit(prefix.charCodeAt(0))) {
            octal = true;
            num = '0' + this.source[this.index++];
        }
        else {
            ++this.index;
        }
        while (!this.eof()) {
            if (!character.isOctalDigit(this.source.charCodeAt(this.index))) {
                break;
            }
            num += this.source[this.index++];
        }
        if (!octal && num.length === 0) {
            // only 0o or 0O
            this.throwUnexpectedToken();
        }
        if (character.isIdentifierStart(this.source.charCodeAt(this.index)) || character.isDecimalDigit(this.source.charCodeAt(this.index))) {
            this.throwUnexpectedToken();
        }
        return {
            type: 6 /* NumericLiteral */,
            value: parseInt(num, 8),
            octal: octal,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }
    // 隐式八进制判断
    isImplicitOctalLiteral () {
        // Implicit octal, unless there is a non-octal digit.
        // (Annex B.1.1 on Numeric Literals)
        for (let i = this.index + 1; i < this.length; ++i) {
            let ch = this.source[i];
            if (ch === '8' || ch === '9') {
                return false;
            }
            if (!character.isOctalDigit(ch.charCodeAt(0))) {
                return true;
            }
        }
        return true;
    }
	// 数字， 需要注意的是let a = .1.2情况也能扫描没有报错，切成了两次,  .1 和.2
	scanNumericLiteral () {
        let start = this.index;
        let ch = this.source[start];
        assert(character.isDecimalDigit(ch.charCodeAt(0)) || (ch === '.'), 'Numeric literal must start with a decimal digit or a decimal point');
        let num = '';
        if (ch !== '.') {
            num = this.source[this.index++];
            ch = this.source[this.index];
            // Hex number starts with '0x'.
            // Octal number starts with '0'.
            // Octal number in ES6 starts with '0o'.
            // Binary number in ES6 starts with '0b'.
            if (num === '0') {
                if (ch === 'x' || ch === 'X') {
                    ++this.index;
                    return this.scanHexLiteral(start);
                }
                if (ch === 'b' || ch === 'B') {
                    ++this.index;
                    return this.scanBinaryLiteral(start);
                }
                if (ch === 'o' || ch === 'O') {
                    return this.scanOctalLiteral(ch, start);
                }
                // 隐式 八进制 070
                if (ch && character.isOctalDigit(ch.charCodeAt(0))) {
                    if (this.isImplicitOctalLiteral()) {
                        return this.scanOctalLiteral(ch, start);
                    }
                }
            }
            while (character.isDecimalDigit(this.source.charCodeAt(this.index))) {
                num += this.source[this.index++];
            }
            ch = this.source[this.index];
        }
        // 小数点处理
        if (ch === '.') {
            num += this.source[this.index++];
            while (character.isDecimalDigit(this.source.charCodeAt(this.index))) {
                num += this.source[this.index++];
            }
            ch = this.source[this.index];
        }
        // 科学计数法 处理
        if (ch === 'e' || ch === 'E') {
            num += this.source[this.index++];
            ch = this.source[this.index];
            if (ch === '+' || ch === '-') {
                num += this.source[this.index++];
            }
            if (character.isDecimalDigit(this.source.charCodeAt(this.index))) {
                while (character.isDecimalDigit(this.source.charCodeAt(this.index))) {
                    num += this.source[this.index++];
                }
            }
            else {
                this.throwUnexpectedToken();
            }
        }
        // 例如let a= .10b || 10b;处理
        if (character.isIdentifierStart(this.source.charCodeAt(this.index))) {
            this.throwUnexpectedToken();
        }
        return {
            type: 6 /* NumericLiteral */,
            value: parseFloat(num),
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }
	// 字符串模版
	scanTemplate () {
        let cooked = '';
        // 是否读取结束
        let terminated = false;
        let start = this.index;
        // 头
        let head = (this.source[start] === '`');
        // 尾
        let tail = false;
        let rawOffset = 2;
        ++this.index;
        while (!this.eof()) {
            let ch = this.source[this.index++];
            // 结束
            if (ch === '`') {
                rawOffset = 1;
                tail = true;
                terminated = true;
                break;
            }
            // 与字符串扫描不同处，变量处理
            else if (ch === '$') {
                if (this.source[this.index] === '{') {
                    this.curlyStack.push('${');
                    ++this.index;
                    terminated = true;
                    break;
                }
                cooked += ch;
            }
            // 转义字符处理和scanStringLiteral 一样
            else if (ch === '\\') {
                ch = this.source[this.index++];
                if (!character.isLineTerminator(ch.charCodeAt(0))) {
                    switch (ch) {
                        case 'n':
                            cooked += '\n';
                            break;
                        case 'r':
                            cooked += '\r';
                            break;
                        case 't':
                            cooked += '\t';
                            break;
                        case 'u':
                            if (this.source[this.index] === '{') {
                                // let a = `\\u{0067}`;
                                ++this.index;
                                cooked += this.scanUnicodeCodePointEscape();
                            }
                            else {
                                // 例如let str = `\\u0067`
                                let restore = this.index;
                                let unescaped_2 = this.scanHexEscape(ch);
                                if (unescaped_2 !== null) {
                                    cooked += unescaped_2;
                                }
                                else {
                                    this.index = restore;
                                    cooked += ch;
                                }
                            }
                            break;
                        case 'x':
                            let unescaped = this.scanHexEscape(ch);
                            if (unescaped === null) {
                                this.throwUnexpectedToken(Messages.InvalidHexEscapeSequence);
                            }
                            cooked += unescaped;
                            break;
                        case 'b':
                            cooked += '\b';
                            break;
                        case 'f':
                            cooked += '\f';
                            break;
                        case 'v':
                            cooked += '\v';
                            break;
                        default:
                            debugger
                            if (ch === '0') {
                                if (character.isDecimalDigit(this.source.charCodeAt(this.index))) {
                                    // Illegal: \01 \02 and so on
                                    this.throwUnexpectedToken(Messages.TemplateOctalLiteral);
                                }
                                cooked += '\0';
                            }
                            else if (character.isOctalDigit(ch.charCodeAt(0))) {
                                // Illegal: \1 \2
                                this.throwUnexpectedToken(Messages.TemplateOctalLiteral);
                            }
                            else {
                                cooked += ch;
                            }
                            break;
                    }
                }
                else {
                    ++this.lineNumber;
                    if (ch === '\r' && this.source[this.index] === '\n') {
                        ++this.index;
                    }
                    this.lineStart = this.index;
                }
            }
            // 与字符串扫描不同处，对换行符进行处理
            else if (character.isLineTerminator(ch.charCodeAt(0))) {
                ++this.lineNumber;
                if (ch === '\r' && this.source[this.index] === '\n') {
                    ++this.index;
                }
                this.lineStart = this.index;
                cooked += '\n';
            }
            else {
                cooked += ch;
            }
        }
        if (!terminated) {
            this.throwUnexpectedToken();
        }
        // 扫描到变量会跳出，当变量扫描完后会根据this.curlyStack最后一位元素判断是否继续扫描模版字符串，此时开头并不是`符号了，head为false，所以处理完后，需要把this.curlyStack最后一位踢出。
        if (!head) {
            this.curlyStack.pop();
        }
        return {
            type: 10 /* Template */,
            value: this.source.slice(start + 1, this.index - rawOffset),
            cooked: cooked,
            head: head,
            tail: tail,
            lineNumber: this.lineNumber,
            lineStart: this.lineStart,
            start: start,
            end: this.index
        };
    }
}