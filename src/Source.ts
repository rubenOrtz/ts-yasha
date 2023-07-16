import SourceError from './SourceError.js'
import YoutubeApi, { YoutubeTrack } from './api/Youtube.js'

type ApiType = 'Youtube'

class APISource<Ready extends boolean = boolean, Api extends ApiType = ApiType> {
    name: Api
    // TODO: make this
    api?: Ready extends true ? Api extends 'Youtube' ? typeof YoutubeApi : typeof YoutubeApi : undefined
    Track?: Ready extends true ? Api extends 'Youtube' ? YoutubeTrack : YoutubeTrack : undefined
    Results: Ready extends true ? any : null = null
    Playlist: Ready extends true ? any : null = null
    #isReady = false
    #promise: Promise<void>

    constructor (api: Api) {
        this.name = api
        this.#promise = import('./api/' + api + '.cjs').then(api => {
            this.api = api.default
            this.Track = api.default.Track
            this.Results = api.default.Results
            this.Playlist = api.default.Playlist
            this.#isReady = true
        }).catch(e => {
            throw SourceError.NOT_FOUND(new Error())
        })
    }

    isReady (): this is APISource<true, Api> {
        return this.#isReady
    }

    async load (): Promise<this> {
        await this.#promise
        return this
    }

    async get (id: string): Promise<ReturnType<typeof this.api.get>> {
        return await this.api.get(id)
    }

    async getStreams (id: string): Promise<ReturnType<typeof this.api.get_streams>> {
        return await this.api.get_streams(id)
    }

    async search (query: string): Promise<any> {
        return null
    }

    async playlistOnce (id: string): Promise<any> {
        return null
    }

    async playlist (id: string, length: number): Promise<ReturnType<typeof this.api.playlist>> {
        return await this.api.playlist(id, length)
    }
}

class Youtube<Ready extends boolean = boolean> extends APISource<Ready, 'Youtube'> {
    Music: Ready extends true ? any : any | null = null
    #promise: Promise<void>
    #id_regex = /^([\w_-]{11})$/
    #isReady = false

    constructor () {
        super('Youtube')

        this.#promise = super.load().then(api => {
            this.Music = this.api.Music
        })
    }

    override isReady (): this is APISource<true, 'Youtube'> {
        return this.#isReady
    }

    override async load (): Promise<this> {
        await this.#promise
        return this
    }

    weak_match (id: string): null | { id: string } {
        if (this.#id_regex.exec(id)) return { id }
        return null
    }

    match (content: string): null | { id: string } | { list: string } {
        let url: URL

        try {
            url = new URL(content)
        } catch (e) {
            return null
        }

        let id = null
        let list = null

        if (url.hostname === 'youtu.be') id = url.pathname.substring(1)
        else if (
            (['www.youtube.com', 'music.youtube.com', 'youtube.com'].includes(url.hostname)) &&
            url.pathname === '/watch'
        ) id = url.searchParams.get('v')

        let match: { id: string } | { list: string } | null = this.weak_match(id ?? '')
        list = url.searchParams.get('list')

        if (!list) return match
        if (!match) match = { list }

        return match
    }

    async resolve (match: { id: string } | { list: string }): Promise<ReturnType<typeof this.api.get> | ReturnType<typeof this.api.playlist_once>> {
        let track = null
        let list = null

        if ((match as { id: string }).id) track = this.api.get((match as { id: string }).id)
        if ((match as { list: string }).list) list = this.api.playlist_once((match as { list: string }).list)
        const result = await Promise.allSettled([track, list])

        track = result[0].value // ? where does this come from?
        list = result[1].value // ? where does this come from?

        if (!track && !list) throw (match as { id: string }).id ? result[0].reason : result[1].reason
        if (list) {
            if (track) list.setFirstTrack(track)
            return list
        }

        return track
    }

    /**
     *
     * @param {*} match
     * @returns {Promise<null | import('./api/Youtube.cjs').Track | import('./api/Youtube.cjs').Playlist>}
     */
    async weak_resolve (match) {
        try {
            return await this.resolve(match)
        } catch (e) {
            return null
        }
    }

    /**
     *
     * @override
     * @param {string} query
     * @param {unknown} [continuation]
     * @returns {Promise<import('./Track.cjs').TrackResults>}
     */
    // @ts-expect-error
    async search (query, continuation) {
        return await this.api.search(query, continuation)
    }

    /**
     *
     * @param {string} id
     * @param {number} [start]
     * @returns {Promise<import('./api/Youtube.cjs').Playlist>}
     */
    // @ts-expect-error
    async playlistOnce (id, start) {
        return await this.api.playlist_once(id, start)
    }

    /**
     *
     * @param {string} cookie
     * @returns {void}
     */
    setCookie (cookie) {
        this.api.set_cookie(cookie)
    }
}
const youtube = new Youtube()

/** @extends {APISource<'Soundcloud'>} */
class Soundcloud extends APISource {
    constructor () {
        super('Soundcloud')
    }

    /**
     *
     * @param {string} content
     * @returns {null | {soundcloud: string} | {shortlink: string}}
     */
    match (content) {
        let url

        try {
            url = new URL(content)
        } catch (e) {
            return null
        }

        if (url.pathname.startsWith('/') && url.pathname.length > 1) {
            if (url.hostname == 'soundcloud.com') return { soundcloud: url.href }
            else if (url.hostname == 'on.soundcloud.com') return { shortlink: url.pathname.substring(1) }
        }

        return null
    }

    /**
     *
     * @param {ReturnType<typeof this.match>} match
     * @returns {Promise<import('./api/Soundcloud.cjs').Track | import('./api/Soundcloud.cjs').Playlist | null>}
     */
    async resolve (match) {
        try {
            // @ts-expect-error
            if (match.shortlink) return await this.api.resolve_shortlink(match.shortlink)
            // @ts-expect-error
            return await this.api.resolve(match.soundcloud)
        } catch (e) {
            // @ts-expect-error
            if (e.code == SourceError.codes.NOT_A_TRACK) return null
            throw e
        }
    }

    /**
     *
     * @param {string} query
     * @param {number} offset
     * @param {number} [length]
     * @returns {Promise<import('./Track.cjs').TrackResults>}
     */
    // @ts-expect-error
    async search (query, offset, length) { // FIXME this offset is required
        return await this.api.search(query, offset, length)
    }

    /**
     *
     * @param {string} id
     * @param {number} [offset]
     * @param {number} [length]
     * @returns {Promise<import('./api/Soundcloud.cjs').Playlist | null>}
     */
    async playlistOnce (id, offset, length) {
        return await this.api.playlist_once(id, offset, length)
    }
}
const soundcloud = new Soundcloud()

/** @extends {APISource<'Spotify'>} */
class Spotify extends APISource {
    constructor () {
        super('Spotify')
    }

    /**
     *
     * @param {string} content
     * @returns {null | {track: string} | {album: string} | {playlist: string}}
     */
    match (content) {
        let url

        try {
            url = new URL(content)
        } catch (e) {
            return null
        }

        if (url.hostname == 'open.spotify.com' && url.pathname.startsWith('/') && url.pathname.length > 1) {
            const data = url.pathname.substring(1).split('/')

            if (data.length != 2) return null
            switch (data[0]) {
                case 'track':
                    return { track: data[1] }
                case 'album':
                    return { album: data[1] }
                case 'playlist':
                    return { playlist: data[1] }
            }
        }

        return null
    }

    /**
     *
     * @param {ReturnType<typeof this.match>} match
     * @returns {Promise<import('./api/Spotify.cjs').Track | import('./api/Spotify.cjs').Playlist | undefined>}
     */
    async resolve (match) {
        // @ts-expect-error
        if (match.track) return await this.api.get(match.track)
        // @ts-expect-error
        if (match.playlist) return await this.api.playlist_once(match.playlist)
        // @ts-expect-error
        if (match.album) return this.api.album_once(match.album)
    }

    /**
     *
     * @param {string} query
     * @param {number} [offset]
     * @param {number} [length]
     * @returns {Promise<import('./Track.cjs').TrackResults>}
     */
    async search (query, offset, length) {
        return await this.api.search(query, offset, length)
    }

    /**
     *
     * @param {string} id
     * @param {number} [offset]
     * @param {number} [length]
     * @returns {Promise<import('./api/Spotify.cjs').Playlist>}
     */
    // @ts-expect-error
    async playlistOnce (id, offset, length) {
        return await this.api.playlist_once(id, offset, length)
    }

    /**
     *
     * @param {string} id
     * @param {number} [offset]
     * @param {number} [length]
     * @returns {Promise<import('./api/Spotify.cjs').Playlist>}
     */
    async albumOnce (id, offset, length) {
        return this.api.album_once(id, offset, length)
    }

    /**
     *
     * @param {string} cookie
     * @returns {void}
     */
    setCookie (cookie) {
        this.api.set_cookie(cookie)
    }
}
const spotify = new Spotify()

/** @extends {APISource<'AppleMusic'>} */
class AppleMusic extends APISource {
    constructor () {
        super('AppleMusic')
    }

    /**
     * @override
     * @param {string} content
     * @returns {null | {track: string} | {album: string} | {playlist: string}}
     */
    match (content) {
        let url

        try {
            url = new URL(content)
        } catch (e) {
            return null
        }

        if (url.hostname == 'music.apple.com' && url.pathname.startsWith('/') && url.pathname.length > 1) {
            const path = url.pathname.substring(1).split('/')

            if (path.length < 2) return null
            if (path[0] != 'playlist' && path[0] != 'album' && path[0] != 'song') path.shift()
            if (path.length < 2) return null
            switch (path[0]) {
                case 'song':
                    return { track: path[1] }
                case 'playlist':
                    return { playlist: path[2] ?? path[1] }
                case 'album':
                    var track = url.searchParams.get('i')

                    if (track) return { track }
                    return { album: path[2] ?? path[1] }
            }
        }

        return null
    }

    /**
     *
     * @param {ReturnType<typeof this.match>} match
     * @returns {Promise<import('./api/AppleMusic.cjs').Track | import('./api/AppleMusic.cjs').Playlist | undefined>}
     */
    async resolve (match) {
        // @ts-expect-error
        if (match.track) return await this.api.get(match.track)
        // @ts-expect-error
        if (match.playlist) return await this.api.playlist_once(match.playlist)
        // @ts-expect-error
        if (match.album) return this.api.album_once(match.album)
    }

    /**
     *
     * @param {string} query
     * @param {number} [offset]
     * @param {number} [length]
     * @returns {Promise<import('./Track.cjs').TrackResults>}
     */
    async search (query, offset, length) {
        return await this.api.search(query, offset, length)
    }

    /**
     *
     * @param {string} id
     * @param {number} [offset]
     * @param {number} [length]
     * @returns
     */
    async playlistOnce (id, offset, length) {
        return await this.api.playlist_once(id, offset, length)
    }

    /**
     *
     * @param {string} id
     * @param {number} [offset]
     * @param {number} [length]
     * @returns {Promise<import('./api/AppleMusic.cjs').Playlist>}
     */
    async albumOnce (id, offset, length) {
        return this.api.album_once(id, offset, length)
    }
}
const apple = new AppleMusic()

/** @extends {APISource<'File'>} */
class File extends APISource {
    constructor () {
        super('File')
    }

    /**
     *
     * @param {string} content
     * @returns {Promise<ReturnType<typeof this.api.create> | null>}
     */
    async resolve (content) {
        // ! async is an addition to the original code.
        let url

        try {
            url = new URL(content)
        } catch (e) {
            return null
        }

        if (url.protocol == 'http:' || url.protocol == 'https:') return this.api.create(content)
        if (url.protocol == 'file:') return this.api.create(content, true)
        return null
    }
}
const file = new File()

class Source {
    /**
     *
     * @name resolve
     * @function
     * @param {string} input
     * @returns {null | Promise<ReturnType<typeof apple.resolve> | ReturnType<typeof soundcloud.resolve> | ReturnType<typeof soundcloud.resolve> | ReturnType<typeof youtube.resolve> | ReturnType<typeof file.api.create>>}
     */
    static resolve (input, weak = true) {
        const sources = [youtube, soundcloud, spotify, apple]
        let match = null

        // @ts-expect-error
        for (var source of sources) if ((match = source.match(input))) return source.resolve(match)
        if (!weak) return null
        // @ts-expect-error
        for (var source of sources) if ((match = source.weak_match(input))) return source.weak_resolve(match)
        return null
    }
}

Source.Error = SourceError
Source.Youtube = youtube
Source.Soundcloud = soundcloud
Source.Spotify = spotify
Source.AppleMusic = apple
Source.File = file

module.exports = Source
