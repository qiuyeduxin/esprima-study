import Scanner from './myScanner.js';
import TokenName from './myToken.js';
import ErrorHandler from './error-handler.js';
class Reader {
	constructor () {
		this.values = [];
		this.curly = this.paren = -1;
	}
	beforeFunctionExpression (t) {
        return ['(', '{', '[', 'in', 'typeof', 'instanceof', 'new',
            'return', 'case', 'delete', 'throw', 'void',
            // assignment operators
            '=', '+=', '-=', '*=', '**=', '/=', '%=', '<<=', '>>=', '>>>=',
            '&=', '|=', '^=', ',',
            // binary/unary operators
            '+', '-', '*', '**', '/', '%', '++', '--', '<<', '>>', '>>>', '&',
            '|', '^', '!', '~', '&&', '||', '?', ':', '===', '==', '>=',
            '<=', '<', '>', '!=', '!=='].indexOf(t) >= 0;
    }
    isRegexStart () {
        let previous = this.values[this.values.length - 1];
        let regex = (previous !== null);
        switch (previous) {
            case 'this':
            case ']':
                regex = false;
                break;
            case ')':
                var keyword = this.values[this.paren - 1];
                regex = (keyword === 'if' || keyword === 'while' || keyword === 'for' || keyword === 'with');
                break;
            case '}':
                // Dividing a function by anything makes little sense,
                // but we have to check for that.
                regex = false;
                if (this.values[this.curly - 3] === 'function') {
                    // Anonymous function, e.g. function(){} /42
                    var check = this.values[this.curly - 4];
                    regex = check ? !this.beforeFunctionExpression(check) : false;
                }
                else if (this.values[this.curly - 4] === 'function') {
                    // Named function, e.g. function f(){} /42/
                    var check = this.values[this.curly - 5];
                    regex = check ? !this.beforeFunctionExpression(check) : true;
                }
                break;
            default:
                break;
        }
        return regex;
    }
    push (token) {
        if (token.type === 7 /* Punctuator */ || token.type === 4 /* Keyword */) {
            if (token.value === '{') {
                this.curly = this.values.length;
            }
            else if (token.value === '(') {
                this.paren = this.values.length;
            }
            this.values.push(token.value);
        }
        else {
            this.values.push(null);
        }
    }
}
export default class Tokenize {
	constructor (code, config) {
		this.source = code;
        let errorHandler = new ErrorHandler();
		this.scanner = new Scanner(code, errorHandler);
		this.scanner.trackComment = config ? (typeof config.comment === 'boolean' && config.comment) : false;
		this.trackLoc = config ? (typeof config.loc === 'boolean' && config.loc) : false;
		this.trackRange = config ? (typeof config.range === 'boolean' && config.range) : false;
		this.buffer = [];
		this.reader = new Reader();
	}
	getNextToken () {
		if (this.buffer.length === 0) {
			let comments = this.scanner.scanComments();
			if (this.scanner.trackComment) {
                for (let i = 0; i < comments.length; ++i) {
                    let e = comments[i];
                    let value = this.scanner.source.slice(e.slice[0], e.slice[1]);
                    let comment = {
                        type: e.multiLine ? 'BlockComment' : 'LineComment',
                        value: value
                    };
                    if (this.trackRange) {
                        comment.range = e.range;
                    }
                    if (this.trackLoc) {
                        comment.loc = e.loc;
                    }
                    this.buffer.push(comment);
                }
            }
            if (!this.scanner.eof()) {
            	let loc = void 0;
            	if (this.trackLoc) {
            		loc = {
            			start: {
            				line: this.scanner.lineNumber,
            				column: this.scanner.index - this.scanner.lineStart
            			},
            			end: {}
            		};
            	}
            	let startRegex = (this.scanner.source[this.scanner.index] === '/') && this.reader.isRegexStart();
            	let token = startRegex ? this.scanner.scanRegExp() : this.scanner.lex();
            	this.reader.push(token);
            	let entry = {
            		type: TokenName[token.type],
            		value: this.scanner.source.slice(token.start, token.end)
            	};
            	if (this.trackRange) {
                    entry.range = [token.start, token.end];
                }
                if (this.trackLoc) {
                    loc.end = {
                        line: this.scanner.lineNumber,
                        column: this.scanner.index - this.scanner.lineStart
                    };
                    entry.loc = loc;
                }
				if (token.type === 9 /* RegularExpression */) {
                    let pattern = token.pattern;
                    let flags = token.flags;
                    entry.regex = { pattern: pattern, flags: flags };
                }
                this.buffer.push(entry);
            }
		}
		return this.buffer.shift();
	}

}
