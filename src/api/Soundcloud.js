const Request = require('../Request')
const SourceError = require('../SourceError')
const util = require('./util')

const { Track, TrackImage, TrackResults, TrackPlaylist, TrackStream, TrackStreams } = require('../Track')

class SoundcloudTrack extends Track {
    /**
     * @type {string | null}
     * @protected
     */
    permalink_url = null

    constructor() {
        super('Soundcloud')
    }

    /**
     *
     * @param {*} track
     * @returns {this}
     */
    from(track) {
        this.permalink_url = track.permalink_url

        const streams = new SoundcloudStreams().from(track)

        if (streams.length) this.setStreams(streams)
        return this.setOwner(track.user.username, [{ url: track.user.avatar_url, width: 0, height: 0 }]).setMetadata(
            track.id + '',
            track.title,
            track.duration / 1000,
            TrackImage.from(this.get_thumbnails(track)),
        )
    }

    /**
     *
     * @param {*} track
     * @returns {{width: number; height: number; url: string}[]}
     */
    get_thumbnails(track) {
        const sizes = [20, 50, 120, 200, 500]
        const visualSizes = [
            [1240, 260],
            [2480, 520],
        ]

        const default_thumbnail = track.artwork_url || track.user.avatar_url
        const multires = /^.*\/(\w+)-([-a-zA-Z0-9]+)-([a-z0-9]+)\.(jpg|png|gif).*$/i.exec(default_thumbnail)

        const thumbnails = []

        if (multires) {
            const type = multires[1]
            const size = multires[3]

            if (type == 'visuals') {
                for (const sz of visualSizes) {
                    thumbnails.push({
                        width: sz[0],
                        height: sz[1],
                        url: default_thumbnail.replace(size, 't' + sz[0] + 'x' + sz[1]),
                    })
                }
            } else {
                for (const sz of sizes) {
                    let rep

                    if (type == 'artworks' && sz == 20) rep = 'tiny'
                    else rep = 't' + sz + 'x' + sz
                    thumbnails.push({
                        width: sz,
                        height: sz,
                        url: default_thumbnail.replace(size, rep),
                    })
                }
            }
        } else {
            /* default image */
            thumbnails.push({
                url: default_thumbnail,
                width: 0,
                height: 0,
            })
        }

        return thumbnails
    }

    /**
     *
     * @returns {Promise<SoundcloudTrack>}
     */
    async fetch() {
        // @ts-ignore
        return await api.get(this.id)
    }

    /**
     *
     * @returns {Promise<SoundcloudStreams>}
     */
    async getStreams() {
        // @ts-ignore
        return await api.get_streams(this.id)
    }

    /**
     * @returns {string | null}
     */
    get url() {
        return this.permalink_url
    }
}

class SoundcloudResults extends TrackResults {
    /** @type {any} */
    query
    /** @type {number} */
    start = 0

    /**
     *
     * @param {any} query
     * @param {number} start
     */
    set_continuation(query, start) {
        this.query = query
        this.start = start
    }

    /**
     *
     * @returns {Promise<SoundcloudResults>}
     */
    async next() {
        return await api.search(this.query, this.start)
    }
}

class SoundcloudPlaylist extends TrackPlaylist {
    /** @type {string | undefined} */
    id
    /** @type {number | undefined} */
    start
    /**
     * @private
     * @type {string | undefined}
     */
    permalink_url
    /**
     *
     * @param {{permalink_url:string;title:string;description:string}} list
     * @returns {this}
     */
    from(list) {
        this.permalink_url = list.permalink_url
        this.setMetadata(list.title, list.description)

        return this
    }

    /**
     *
     * @param {string} id
     * @param {number} start
     */
    set_continuation(id, start) {
        this.id = id
        this.start = start
    }

    /** @type {string | undefined} */
    // @ts-ignore
    get url() {
        return this.permalink_url
    }

    /**
     *
     * @returns {Promise<SoundcloudPlaylist | null>}
     */
    async next() {
        // @ts-ignore
        if (this.id) return api.playlist_once(this.id, this.start)
        return null
    }
}

class SoundcloudStream extends TrackStream {
    /**
     * @private
     * @type {string}
     */
    stream_url
    /**
     *
     * @param {string} url
     */
    constructor(url) {
        super(null)

        this.stream_url = url
    }

    async getUrl() {
        var body = await api.request(this.stream_url)

        if (body && body.url) return body.url
        throw new SourceError.INTERNAL_ERROR(null, new Error('No stream url found'))
    }
}

class SoundcloudStreams extends TrackStreams {
    /**
     *
     * @param {{media:{transcodings:{format:{mime_type:string};url:string;duration:number}[]}}} track
     * @returns
     */
    from(track) {
        if (track.media && track.media.transcodings) {
            this.set(1, false, Date.now())
            this.extract_streams(track.media.transcodings)
        }

        return this
    }

    /**
     *
     * @param {{format:{mime_type:string};url:string;duration:number}[]} streams
     */
    extract_streams(streams) {
        for (var stream of streams) {
            // @ts-ignore
            var [match, container, codecs] = /audio\/([a-zA-Z0-9]{3,4})(?:;(?:\+| )?codecs="(.*?)")?/.exec(
                stream.format.mime_type,
            )

            if (container == 'mpeg' && !codecs) codecs = 'mp3'
            this.push(
                new SoundcloudStream(stream.url)
                    .setDuration(stream.duration / 1000)
                    .setBitrate(-1)
                    .setTracks(false, true)
                    .setMetadata(container, codecs),
            )
        }
    }

    /**
     *
     * @returns {boolean}
     */
    expired() {
        return false
    }

    /**
     *
     * @returns {boolean}
     */
    maybeExpired() {
        return false
    }
}

var api = new (class SoundcloudAPI {
    /**
     * @private
     * @type {string | null}
     */
    client_id
    /** @type {Promise<void> | null} */
    reloading

    constructor() {
        this.client_id = null
        this.reloading = null
    }

    /**
     *
     * @returns {Promise<void>}
     */
    async reload() {
        if (this.reloading) return
        this.reloading = this.load()

        try {
            await this.reloading
        } catch (e) {}

        this.reloading = null
    }

    /**
     * @returns {Promise<void>}
     */
    async prefetch() {
        if (!this.client_id) this.reload()
        if (this.reloading) await this.reloading
    }

    /**
     *
     * @returns {Promise<void>}
     */
    async load() {
        var { body } = await Request.get('https://soundcloud.com')
        var regex = /<script crossorigin src="(.*?)"><\/script>/g
        var result

        while ((result = regex.exec(body))) {
            var script = (await Request.get(result[1])).body
            var id = /client_id:"([\w\d_-]+?)"/i.exec(script)

            if (id && id[1]) {
                this.client_id = util.deepclone(id[1])

                return
            }
        }

        throw new SourceError.INTERNAL_ERROR(null, new Error('Could not find client id'))
    }

    /**
     * @param {string} path
     * @param {{[key:string]:string|null}} [query]
     * @returns {Promise<any>}
     */
    async request(path, query = {}) {
        var res,
            body,
            queries = []

        for (var tries = 0; tries < 2; tries++) {
            await this.prefetch()

            query.client_id = this.client_id
            queries = []

            for (var name in query) queries.push(name + '=' + query[name])
            res = (await Request.getResponse(path + '?' + queries.join('&'))).res

            if (res.status == 401) {
                if (tries) throw new SourceError.INTERNAL_ERROR(null, new Error('Unauthorized'))
                this.reload()

                continue
            }

            break
        }

        try {
            body = await res.text()
        } catch (e) {
            if (!res.ok) throw new SourceError.INTERNAL_ERROR(null, e)
            throw new SourceError.NETWORK_ERROR(null, e)
        }

        if (res.status == 404) throw new SourceError.NOT_FOUND('Not found')
        if (!res.ok) throw new SourceError.INTERNAL_ERROR(null, new Error(body))
        try {
            body = JSON.parse(body)
        } catch (e) {
            throw new SourceError.INVALID_RESPONSE(null, e)
        }

        return body
    }

    /**
     * @param {string} path
     * @param {{[key:string]:any}} [query]
     * @returns {Promise<any>}
     * @private
     */
    async api_request(path, query) {
        return await this.request('https://api-v2.soundcloud.com/' + path, query)
    }

    /**
     * @param {{tracks:{id:string;streamable:boolean}[];permalink_url:string;title: string;description: string;id:string;}} list
     * @param {number} offset
     * @param {number} limit
     * @returns {Promise<SoundcloudPlaylist|null>}
     * @private
     */
    async resolve_playlist(list, offset = 0, limit) {
        var unresolved_index = -1
        var tracks = new SoundcloudPlaylist()

        if (!list || typeof list != 'object' || !(list.tracks instanceof Array))
            throw new SourceError.INTERNAL_ERROR(null, new Error('Invalid list'))
        if (offset == 0) tracks.from(list)
        if (offset >= list.tracks.length) return null
        try {
            for (var i = offset; i < list.tracks.length; i++) {
                if (list.tracks[i].streamable === undefined) {
                    unresolved_index = i

                    break
                }

                tracks.push(new SoundcloudTrack().from(list.tracks[i]))
            }
        } catch (e) {
            throw new SourceError.INTERNAL_ERROR(null, e)
        }

        if (!limit || limit + offset > list.tracks.length) limit = list.tracks.length
        else limit += offset
        while (unresolved_index != -1 && unresolved_index < limit) {
            var ids = list.tracks.slice(unresolved_index, unresolved_index + 50)
            var body = await this.api_request('tracks', { ids: ids.map((track) => track.id).join(',') })

            try {
                if (!body.length) break
                for (var track of body) tracks.push(new SoundcloudTrack().from(track))
            } catch (e) {
                throw new SourceError.INTERNAL_ERROR(null, e)
            }

            unresolved_index += body.length
        }

        tracks.set_continuation(list.id, offset + tracks.length)

        return tracks
    }

    /**
     * @param {string} url
     * @returns {Promise<SoundcloudTrack|SoundcloudPlaylist|null>}
     */
    async resolve(url) {
        var body = await this.api_request('resolve', { url: encodeURIComponent(url) })

        if (body.kind == 'track') {
            try {
                return new SoundcloudTrack().from(body)
            } catch (e) {
                throw new SourceError.INTERNAL_ERROR(null, e)
            }
        } else if (body.kind == 'playlist') {
            return this.resolve_playlist(body, 0, 50)
        } else {
            // @ts-ignore
            throw new SourceError.NOT_A_TRACK(null, new Error('Unsupported kind: ' + body.kind))
        }
    }

    /**
     * @param {string} id
     * @returns {Promise<SoundcloudTrack|SoundcloudPlaylist|null>}
     * @private
     */
    async resolve_shortlink(id) {
        var res, body, location, url

        url = 'https://on.soundcloud.com/' + encodeURIComponent(id)

        for (var redirects = 0; redirects < 5; redirects++) {
            res = (await Request.getResponse(url, { redirect: 'manual' })).res

            try {
                body = await res.text()
            } catch (e) {
                if (!res.ok) throw new SourceError.INTERNAL_ERROR(null, e)
                throw new SourceError.NETWORK_ERROR(null, e)
            }

            if (res.status == 404) throw new SourceError.NOT_FOUND()
            if (res.status != 302 || !res.headers.has('Location'))
                throw new SourceError.INTERNAL_ERROR(null, new Error(body))
            location = res.headers.get('Location')

            try {
                location = new URL(location, 'https://on.soundcloud.com/')
            } catch (e) {
                throw new SourceError.INVALID_RESPONSE('Invalid redirect URL', new Error('Response URL: ' + location))
            }

            url = location.href

            if (
                location.hostname == 'soundcloud.com' &&
                location.pathname.startsWith('/') &&
                location.pathname.length > 1
            )
                return this.resolve(url)
        }

        throw new SourceError.INVALID_RESPONSE('Too many redirects')
    }

    /**
     * @param {string} id
     * @private
     * @returns {void}
     */
    check_valid_id(id) {
        if (!/^[\d]+$/.test(id)) throw new SourceError.NOT_FOUND()
    }

    /**
     * @param {string} id
     * @returns {Promise<SoundcloudTrack|SoundcloudPlaylist|null>}
     */
    async get(id) {
        this.check_valid_id(id)

        var body = await this.api_request('tracks/' + id)

        var track

        try {
            track = new SoundcloudTrack().from(body)
        } catch (e) {
            throw new SourceError.INTERNAL_ERROR(null, e)
        }

        // @ts-ignore
        if (!track.streams) throw new SourceError.UNPLAYABLE('No streams found')
        return track
    }

    /**
     * @param {string} id
     * @returns {Promise<SoundcloudStreams>}
     * @private
     */
    async get_streams(id) {
        this.check_valid_id(id)

        var body = await this.api_request('tracks/' + id)

        var streams

        try {
            streams = new SoundcloudStreams().from(body)
        } catch (e) {
            throw new SourceError.INTERNAL_ERROR(null, e)
        }

        // @ts-ignore
        if (!streams.length) throw new SourceError.UNPLAYABLE('No streams found')
        return streams
    }

    /**
     * @param {string} query
     * @param {number} offset
     * @param {number} [limit]
     * @returns {Promise<SoundcloudResults>}
     */
    async search(query, offset, limit = 20) {
        var body = await this.api_request('search/tracks', { q: encodeURIComponent(query), limit, offset })

        try {
            var results = new SoundcloudResults()

            for (var item of body.collection) results.push(new SoundcloudTrack().from(item))
            if (body.collection.length) results.set_continuation(query, offset + limit)
            return results
        } catch (e) {
            throw new SourceError.INTERNAL_ERROR(null, e)
        }
    }

    /**
     * @param {string} id
     * @param {number} [offset]
     * @param {number} [limit]
     * @returns {Promise<SoundcloudPlaylist|null>}
     * @private
     */
    async playlist_once(id, offset = 0, limit = 50) {
        this.check_valid_id(id)

        var body = await this.api_request('playlists/' + id)

        return this.resolve_playlist(body, offset, limit)
    }

    /**
     * @param {string} id
     * @param {number} [limit]
     * @returns {Promise<SoundcloudPlaylist|null>}
     */
    async playlist(id, limit) {
        return this.playlist_once(id, 0, limit)
    }
})()

module.exports = api
module.exports.Track = SoundcloudTrack
module.exports.Results = SoundcloudResults
module.exports.Playlist = SoundcloudPlaylist
