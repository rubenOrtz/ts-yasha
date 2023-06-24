// @ts-nocheck

/** @type {{[key:string]:{message:string;code:number}}} */
const errors = {
	NETWORK_ERROR: {
		message: 'Network error',
		code: 1
	},

	INVALID_RESPONSE: {
		message: 'Invalid response',
		code: 2
	},

	INTERNAL_ERROR: {
		message: 'Internal error',
		code: 3
	},

	NOT_FOUND: {
		message: 'Not found',
		code: 4
	},

	UNPLAYABLE: {
		message: 'Unplayable',
		code: 5
	},

	NOT_A_TRACK: {
		message: 'Not a track',
		code: 6
	}
};

/**
 * @type {{[key: number]: { message: string; code: number }}}
 */
const errorCode = {};

for(const name in errors)
	errorCode[errors[name].code] = errors[name];

class SourceError extends Error{
	
	/**
	 * 
	 * @param {number} code 
	 * @param {string} message 
	 * @param {Error} error 
	 */
	constructor(code, message, error){
		super(message || errorCode[code].message);

		this.code = code;

		if(error){
			this.stack = error.stack;
			this.details = error.message;
		}
	}
}


SourceError.INTERNAL_ERROR = undefined;

SourceError.NETWORK_ERROR = undefined;

SourceError.NOT_FOUND = undefined;

SourceError.INVALID_RESPONSE = undefined;

SourceError.codes = {};

for(const name in errors){
	SourceError[name] = SourceError.bind(null, errors[name].code);
	SourceError.codes[name] = errors[name].code;
}

module.exports = SourceError;