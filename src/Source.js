const SourceError = require('./SourceError')

/**
 * @template T extends 'Soundcloud' | 'Spotify' | 'Youtube'
 */
class APISource {
    /** @type {T} */
    name
    /** @type {T extends 'File' ? import('./api/File') : T extends 'Soundcloud' ? import('./api/Soundcloud') : T extends 'Spotify' ? import('./api/Spotify') : import('./api/Youtube')} */
    api
    /** @type {T extends 'File' ? undefined : T extends 'Soundcloud' ? typeof import('./api/Soundcloud').Track : T extends 'Spotify' ? typeof import('./api/Spotify').Track : typeof import('./api/Youtube').Track} */
    Track
    /** @type {T extends 'File' ? undefined : T extends 'Soundcloud' ? typeof import('./api/Soundcloud').Results : T extends 'Spotify' ? typeof import('./api/Spotify').Results : typeof import('./api/Youtube').Results}*/
    Results
    /** @type {T extends 'File' ? undefined : T extends 'Soundcloud' ? typeof import('./api/Soundcloud').Playlist : T extends 'Spotify' ? typeof import('./api/Spotify').Playlist : typeof import('./api/Youtube').Playlist}*/
    Playlist

    /**
     *
     * @param {T} api
     */
    constructor(api) {
        this.name = api
        this.api = require('./api/' + api)

        // @ts-ignore
        this.Track = this.api.Track
        // @ts-ignore
        this.Results = this.api.Results
        // @ts-ignore
        this.Playlist = this.api.Playlist
    }

    /**
     *
     * @param {string} content
     * @returns {any}
     */
    match(content) {
        return null
    }

    /**
     *
     * @param {any} content
     * @returns {any}
     */
    weak_match(content) {
        return null
    }

    /**
     *
     * @param {any} content
     * @returns {boolean}
     */
    matches(content) {
        return this.match(content) ? true : false
    }

    /**
     * @param {any} match
     * @returns {Promise<any>}
     */
    async resolve(match) {
        return null
    }

    /**
     *
     * @param {string} id
     * @returns {Promise<ReturnType<typeof this.api.get>>}
     */
    async get(id) {
        return this.api.get(id)
    }

    /**
     *
     * @param {string} id
     * @returns {Promise<ReturnType<typeof this.api.get_streams>>}
     */
    async getStreams(id) {
        return this.api.get_streams(id)
    }

    /**
     *
     * @param {string} query
     * @returns {Promise<any>}
     */
    async search(query) {
        return null
    }

    /**
     * @param {string} id
     * @returns {Promise<any>}
     */
    async playlistOnce(id) {
        return null
    }

    /**
     *
     * @param {string} id
     * @param {number} [length]
     * @returns {Promise<ReturnType<typeof this.api.playlist>>}
     */
    async playlist(id, length) {
        return this.api.playlist(id, length)
    }
}

/** @extends {APISource<'Youtube'>} */
class Youtube extends APISource {
    constructor() {
        super('Youtube')

        this.Music = this.api.Music

        this.id_regex = /^([\w_-]{11})$/
    }

    /**
     *
     * @param {string} id
     * @returns {{id: string} | null}}
     */
    weak_match(id) {
        if (this.id_regex.exec(id)) return { id }
        return null
    }

    /**
     *
     * @param {string} content
     * @returns {{id:string} | {list:string} | null}}
     */
    match(content) {
        var url

        try {
            url = new URL(content)
        } catch (e) {
            return null
        }

        var id = null,
            list = null

        if (url.hostname == 'youtu.be') id = url.pathname.substring(1)
        else if (
            (url.hostname == 'www.youtube.com' ||
                url.hostname == 'music.youtube.com' ||
                url.hostname == 'youtube.com') &&
            url.pathname == '/watch'
        )
            id = url.searchParams.get('v')
        // @ts-ignore
        var match = this.weak_match(id)

        list = url.searchParams.get('list')

        if (!list) return match
        // @ts-ignore
        if (!match) match = { list }

        return match
    }

    /**
     *
     * @param {Exclude<ReturnType<Awaited<typeof this.match>>, null>} match
     * @returns
     */
    async resolve(match) {
        var track = null,
            list = null

        // @ts-ignore
        if (match.id) track = this.api.get(match.id)
        // @ts-ignore
        if (match.list) list = this.api.playlist_once(match.list)
        var result = await Promise.allSettled([track, list])

        track = result[0].value //? where does this come from?
        list = result[1].value //? where does this come from?

        if (!track && !list) throw match.id ? result[0].reason : result[1].reason
        if (list) {
            if (track) list.setFirstTrack(track)
            return list
        }

        return track
    }

    async weak_resolve(match) {
        try {
            return this.resolve(match)
        } catch (e) {
            return null
        }
    }

    async search(query, continuation) {
        return this.api.search(query, continuation)
    }

    async playlistOnce(id, start) {
        return this.api.playlist_once(id, start)
    }

    setCookie(cookie) {
        this.api.set_cookie(cookie)
    }
}
var youtube = new Youtube()

/** @extends {APISource<'Soundcloud'>} */
class Soundcloud extends APISource {
    constructor() {
        super('Soundcloud')
    }

    /**
     *
     * @param {string} content
     * @returns
     */
    match(content) {
        var url

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

    async resolve(match) {
        try {
            if (match.shortlink) return await this.api.resolve_shortlink(match.shortlink)
            return await this.api.resolve(match.soundcloud)
        } catch (e) {
            if (e.code == SourceError.codes.NOT_A_TRACK) return null
            throw e
        }
    }

    async search(query, offset, length) {
        return this.api.search(query, offset, length)
    }

    async playlistOnce(id, offset, length) {
        return this.api.playlist_once(id, offset, length)
    }
}
var soundcloud = new Soundcloud()

/** @extends {APISource<'Spotify'>} */
class Spotify extends APISource {
    constructor() {
        super('Spotify')
    }

    /**
     *
     * @param {string} content
     * @returns
     */
    match(content) {
        var url

        try {
            url = new URL(content)
        } catch (e) {
            return null
        }

        if (url.hostname == 'open.spotify.com' && url.pathname.startsWith('/') && url.pathname.length > 1) {
            var data = url.pathname.substring(1).split('/')

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

    async resolve(match) {
        if (match.track) return this.api.get(match.track)
        if (match.playlist) return this.api.playlist_once(match.playlist)
        if (match.album) return this.api.album_once(match.album)
    }

    async search(query, offset, length) {
        return this.api.search(query, offset, length)
    }

    async playlistOnce(id, offset, length) {
        return this.api.playlist_once(id, offset, length)
    }

    async albumOnce(id, offset, length) {
        return this.api.album_once(id, offset, length)
    }

    setCookie(cookie) {
        this.api.set_cookie(cookie)
    }
}
var spotify = new Spotify()

/** @extends {APISource<'AppleMusic'>} */
class AppleMusic extends APISource {
    constructor() {
        super('AppleMusic')
    }

    /**
     * @override
     * @param {string} content
     * @returns
     */
    match(content) {
        var url

        try {
            url = new URL(content)
        } catch (e) {
            return null
        }

        if (url.hostname == 'music.apple.com' && url.pathname.startsWith('/') && url.pathname.length > 1) {
            var path = url.pathname.substring(1).split('/')

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

    async resolve(match) {
        if (match.track) return this.api.get(match.track)
        if (match.playlist) return this.api.playlist_once(match.playlist)
        if (match.album) return this.api.album_once(match.album)
    }

    async search(query, offset, length) {
        return this.api.search(query, offset, length)
    }

    async playlistOnce(id, offset, length) {
        return this.api.playlist_once(id, offset, length)
    }

    async albumOnce(id, offset, length) {
        return this.api.album_once(id, offset, length)
    }
}
var apple = new AppleMusic()

/** @extends {APISource<'File'>} */
class File extends APISource {
    constructor() {
        super('File')
    }

    /**
     *
     * @param {string} content
     * @returns {Promise<ReturnType<typeof this.api.create> | null>}
     */
    async resolve(content) {
        // ! async is an addition to the original code.
        var url

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
var file = new File()

class Source {
    /**
     *
     * @name resolve
     * @function
     * @param {string} input
     * @param {boolean} weak
     * @returns {null}
     */
    static resolve(input, weak = true) {
        var sources = [youtube, soundcloud, spotify, apple]
        var match = null

        for (var source of sources) if ((match = source.match(input))) return source.resolve(match)
        if (!weak) return null
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
