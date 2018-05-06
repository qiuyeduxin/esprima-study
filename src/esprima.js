import Tokenize from './myTokenize.js';
export default class Esprima{
	constructor () {
	}
	tokenize (code, config) {
		this.tokenize1 = new Tokenize(code, config);
		let tokens = [];
	    try {
	        while (true) {
	            let token = this.tokenize1.getNextToken();
	            if (!token) {
	                break;
	            }
	            tokens.push(token);
	        }
	    }
	    catch (e) {
	    	console.log(e);
	    }
	    console.log(tokens);
	    return tokens;
	}
}