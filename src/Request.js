const SourceError = require('./SourceError');

const httpsAgent = new (require('https').Agent)({keepAlive: true});
const nfetch = require('node-fetch');

/**
 * 
 * @param {string} url 
 * @param {import('node-fetch').RequestInit} [opts] 
 * @returns {Promise<import('node-fetch').Response>}
 */
async function fetch(url, opts = {}){
	opts.agent = httpsAgent;

	// @ts-ignore
	return nfetch(url, opts);
}

module.exports = new class{
	/**
	 * 
	 * @param {string} url 
	 * @param {import('node-fetch').RequestInit} [options] 
	 * @returns {Promise<{res: import('node-fetch').Response}>}
	 */
	async getResponse(url, options){
		var res;

		try{
			res = await fetch(url, options);
		}catch(e){
			throw new SourceError.NETWORK_ERROR(null, e);
		}

		return {res};
	}

	/**
	 * 
	 * @param {string} url 
	 * @param {import('node-fetch').RequestInit} [options] 
	 * @returns {Promise<{res: import('node-fetch').Response, body: string}>}
	 */
	async get(url, options){
		const {res} = await this.getResponse(url, options);

		var body;

		try{
			body = await res.text();
		}catch(e){
			if(!res.ok)
				throw new SourceError.INTERNAL_ERROR(null, e);
			throw new SourceError.NETWORK_ERROR(null, e);
		}

		if(!res.ok)
			throw new SourceError.INTERNAL_ERROR(null, new Error(body));
		return {res, body};
	}

	/**
	 * 
	 * @param {string} url 
	 * @param {import('node-fetch').RequestInit} [options] 
	 * @returns {Promise<{res: import('node-fetch').Response; body: {[key: string]:string}}>}
	 */
	async getJSON(url, options){
		const data = await this.get(url, options);

		try{
			data.body = JSON.parse(data.body);
		}catch(e){
			throw new SourceError.INVALID_RESPONSE(null, e);
		}

		// @ts-ignore
		return data;
	}

	/**
	 * 
	 * @param {string} url 
	 * @param {import('node-fetch').RequestInit} [options] 
	 * @returns {Promise<{res: import('node-fetch').Response; body: Buffer}>}
	 */
	async getBuffer(url, options){
		const {res} = await this.getResponse(url, options);

		var body;

		try{
			body = await res.buffer();
		}catch(e){
			if(!res.ok)
				throw new SourceError.INTERNAL_ERROR(null, e);
			throw new SourceError.NETWORK_ERROR(null, e);
		}

		if(!res.ok)
			throw new SourceError.INTERNAL_ERROR(null, new Error(body.toString('utf8')));
		return {res, body};
	}
};