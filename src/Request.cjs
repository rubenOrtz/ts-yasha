// @ts-nocheck

const SourceError = require('./SourceError.js')

const httpsAgent = new (require('https').Agent)({ keepAlive: true })

/**
 *
 * @param {string} url
 * @param {RequestInit} [opts]
 * @returns {Promise<Response>}
 */
async function fetch (url, opts = {}) {
    opts.agent = httpsAgent

    return globalThis.fetch(url, opts)
}

module.exports = new class {
    /**
	 *
	 * @param {string} url
	 * @param {RequestInit} [options]
	 * @returns {Promise<Response}>}
	 */
    async getResponse (url, options) {
        let res

        try {
            res = await fetch(url, options)
        } catch (e) {
            throw new SourceError.NETWORK_ERROR(null, e)
        }

        return { res }
    }

    /**
	 *
	 * @param {string} url
	 * @param {import('node-fetch').RequestInit} [options]
	 * @returns {Promise<{res: import('node-fetch').Response, body: string}>}
	 */
    async get (url, options) {
        const { res } = await this.getResponse(url, options)

        let body

        try {
            body = await res.text()
        } catch (e) {
            if (!res.ok) { throw new SourceError.INTERNAL_ERROR(null, e) }
            throw new SourceError.NETWORK_ERROR(null, e)
        }

        if (!res.ok) { throw new SourceError.INTERNAL_ERROR(null, new Error(body)) }
        return { res, body }
    }

    /**
	 *
	 * @param {string} url
	 * @param {import('node-fetch').RequestInit} [options]
	 * @returns {Promise<{res: import('node-fetch').Response; body: {[key: string]:string}}>}
	 */
    async getJSON (url, options) {
        const data = await this.get(url, options)

        try {
            data.body = JSON.parse(data.body)
        } catch (e) {
            throw new SourceError.INVALID_RESPONSE(null, e)
        }

        // @ts-ignore
        return data
    }

    /**
	 *
	 * @param {string} url
	 * @param {import('node-fetch').RequestInit} [options]
	 * @returns {Promise<{res: import('node-fetch').Response; body: Buffer}>}
	 */
    async getBuffer (url, options) {
    // @ts-ignore
        const { res } = await this.getResponse(url, options)

        let body

        try {
            body = await res.buffer()
        } catch (e) {
            if (!res.ok) { throw new SourceError.INTERNAL_ERROR(null, e) }
            throw new SourceError.NETWORK_ERROR(null, e)
        }

        if (!res.ok) { throw new SourceError.INTERNAL_ERROR(null, new Error(body.toString('utf8'))) }
        return { res, body }
    }
}()
