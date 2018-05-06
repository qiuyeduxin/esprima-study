import Esprima from './esprima.js';
let esprima = new Esprima();
var program = `
	let a = 100;
`;
esprima.tokenize(program, {
	comment: true,
	range: true,
	loc: true
});
