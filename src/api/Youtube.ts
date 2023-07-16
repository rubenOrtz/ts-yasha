import crypto from 'node:crypto'
import Request from '../Request.cjs'
import SourceError from '../SourceError.js'
import { genPlaylistContinuation, genSearchOptions, playlistNextOffset } from '../proto/youtube.js'
import { Track, TrackImage, TrackResults, TrackPlaylist, TrackStream, TrackStreams, ImageDetails } from '../Track.js'

function getProperty (array: any, prop: any): any {
    if (!(array instanceof Array)) return null
    for (const item of array) if (item?.[prop]) return item[prop]
    return null
}

function text (txt: any): string {
    if (!txt) return ''
    if (txt.simpleText) return txt.simpleText
    if (txt.runs) return txt.runs[0].text
    return ''
}

function checkPlayable (st: { status: string, reason: string }): void {
    if (!st) return
    const { status, reason } = st

    if (!status) return
    switch (status.toLowerCase()) {
        case 'ok':
            return
        case 'error':
            if (reason === 'Video unavailable') throw SourceError.NOT_FOUND(new Error('Video not found'))
            break
        case 'unplayable':
            throw SourceError.UNPLAYABLE(new Error(reason || status))
        case 'login_required':
            throw SourceError.UNPLAYABLE(new Error('Video is age restricted'))
        case 'content_check_required':
            throw SourceError.UNPLAYABLE(new Error('Content check required'))
        case 'age_check_required':
            throw SourceError.UNPLAYABLE(new Error('Age check required'))
        default:
            throw SourceError.UNPLAYABLE(new Error(reason || status))
    }
}

function number (n: string): number {
    const nu = parseInt(n, 10)

    if (Number.isFinite(nu)) return nu
    return 0
}

function parseTimestamp (str: string): number {
    const tokens = str.split(':').map((token) => parseInt(token))

    const scale = [1, 60, 3600, 86400]
    let seconds = 0

    if (tokens.length > scale.length) return -1
    for (let i = tokens.length - 1; i >= 0; i--) {
        if (!Number.isInteger(tokens[i])) return -1
        seconds += tokens[i] * scale[Math.min(3, tokens.length - i - 1)]
    }

    return seconds
}

function youtubeThumbnails (videoId: string): TrackImage[] {
    return [new TrackImage(`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`, 320, 180)]
}

interface FromOptions {
    videoId: string
    title: string
    shortBylineText: string
    lengthSeconds: string
    isPlayable: boolean
    lengthText?: {
        simpleText: string
    }
    channelThumbnail?: {
        thumbnails: ImageDetails[]
    }
    channelThumbnailSupportedRenderers?: {
        channelThumbnailWithLinkRenderer: {
            thumbnail: {
                thumbnails: ImageDetails[]
            }
        }
    }
}

class YoutubeTrack extends Track<'Youtube'> {
    constructor (opts: { id: string, title: string, author: string, icons?: TrackImage[], duration?: number, thumbnails?: TrackImage[] }) {
        super('Youtube', opts.id, opts.title, opts.author, opts.icons)

        this.duration = opts.duration ?? -1
        this.thumbnails = opts.thumbnails ?? []
    }

    static from (details: Omit<FromOptions, 'isPlayable'>, author: { title: string, thumbnail: { thumbnails: ImageDetails[] } }, streams: YoutubeStream[]): YoutubeTrack {
        return new YoutubeTrack({
            id: details.videoId,
            title: details.title,
            author: text(author.title),
            icons: TrackImage.from(author.thumbnail.thumbnails),
            duration: number(details.lengthSeconds),
            thumbnails: youtubeThumbnails(details.videoId),
        }).setStreams(streams)
    }

    static from_search (track: Omit<FromOptions, 'lengthSeconds' | 'isPlayable'>): YoutubeTrack {
        let thumbnails: ImageDetails[] = []

        if (track.channelThumbnailSupportedRenderers) thumbnails = track.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails
        else if (track.channelThumbnail) thumbnails = track.channelThumbnail.thumbnails
        return new YoutubeTrack({
            id: track.videoId,
            author: text(track.shortBylineText),
            title: text(track.title),
            icons: TrackImage.from(thumbnails),
            duration: track.lengthText ? parseTimestamp(track.lengthText.simpleText) : -1,
            thumbnails: youtubeThumbnails(track.videoId),
        })
    }

    static from_playlist (track: FromOptions): YoutubeTrack {
        return new YoutubeTrack({
            id: track.videoId,
            title: text(track.title),
            author: text(track.shortBylineText),
            icons: youtubeThumbnails(track.videoId),
            duration: number(track.lengthSeconds),
            thumbnails: youtubeThumbnails(track.videoId),
        }).setPlayable(!!track.isPlayable)
    }

    async fetch (): Promise<YoutubeTrack> {
        return await api.get(this.id)
    }

    async getStreams (): Promise<YoutubeStreams> {
        return await api.get_streams(this.id)
    }

    get url (): string {
        return 'https://www.youtube.com/watch?v=' + this.id
    }
}

class YoutubeResults extends TrackResults<'Youtube'> {
    continuation: unknown

    process (body: Array<{ continuationItemRenderer?: any, itemSectionRenderer?: any }>): void {
        for (const item of body) {
            if (item.continuationItemRenderer) this.set_continuation(item.continuationItemRenderer.continuationEndpoint.continuationCommand.token)
            else if (item.itemSectionRenderer) this.extract_tracks(item.itemSectionRenderer.contents)
        }
    }

    extract_tracks (list: Array<{ videoRenderer?: Omit<FromOptions, 'lengthSeconds' | 'isPlayable'> }>): void {
        for (const video of list) if (video.videoRenderer) this.push(YoutubeTrack.from_search(video.videoRenderer))
    }

    set_continuation (cont: unknown): void {
        this.continuation = cont
    }

    async next (): Promise<YoutubeResults | null> {
        if (this.continuation) return await api.search(null, this.continuation)
        return null
    }
}

class YoutubePlaylist extends TrackPlaylist<'Youtube'> {
    id = ''
    next_offset?: number

    constructor (id?: string) {
        super()

        this.id = id ?? ''
    }

    process (id: string, data: Array<{ playlistVideoRenderer?: FromOptions, continuationItemRenderer?: { continuationEndpoint: { continuationCommand: { token: string } } } }>, _: any): void {
        this.id = id

        for (const item of data) {
            if (item.continuationItemRenderer) {
                this.next_offset = playlistNextOffset(
                    item.continuationItemRenderer.continuationEndpoint.continuationCommand.token,
                )
            } else if (item.playlistVideoRenderer) this.push(YoutubeTrack.from_playlist(item.playlistVideoRenderer))
        }
    }

    override async next (): Promise<YoutubePlaylist | null> {
        if (this.next_offset) return await api.playlist_once(this.id, this.next_offset)
        return null
    }

    get url (): string | null {
        if (this.id) return 'https://www.youtube.com/playlist?list=' + this.id
        return null
    }
}

class YoutubeStream extends TrackStream {
    itag: unknown
    /**
     *
     * @param {string} url
     * @param {unknown} itag
     */
    constructor (url: string, itag: unknown) {
        super(url)

        this.itag = itag
    }

    override equals (other: YoutubeStream): boolean {
        return !!(other instanceof YoutubeStream && this.itag && this.itag === other.itag)
    }
}

class YoutubeStreams extends TrackStreams {
    expire: number
    start: number

    constructor ({ expire, live, start }: { expire: number, live?: boolean, start?: number }) {
        super({
            live,
        })

        this.expire = expire
        this.start = start ?? Date.now()
    }

    static from (playerResponse: { streamingData: { formats?: any, adaptiveFormats?: any, expiresInSeconds: number }, playerConfig?: { audioConfig?: { loudnessDb: number } } }, start = Date.now()): YoutubeStreams {
        const loudness = playerResponse.playerConfig?.audioConfig?.loudnessDb ?? 0

        const { formats, adaptiveFormats, expiresInSeconds } = playerResponse.streamingData
        const ns: YoutubeStream = []
        if (!this.live && formats) ns.concat(YoutubeStreams.extract_streams(formats, false))
        if (adaptiveFormats) this.extract_streams(adaptiveFormats, true)
        const expire = start + parseInt(expiresInSeconds, 10) * 1000
        this.set(Math.min(1, Math.pow(10, -loudness / 20)), playerResponse.videoDetails.isLive, start)

        return new YoutubeStreams()
    }

    override expired (): boolean {
        return Date.now() > (this.expire ?? 0)
    }

    extract_streams (streams: unknown[], live?: boolean, adaptive?: boolean): YoutubeStream[] {
        const ns: YoutubeStream[] = []
        for (const fmt of streams) {
            if (fmt.type == 'FORMAT_STREAM_TYPE_OTF') continue
            const stream = new YoutubeStream(fmt.url, fmt.itag)

            if (this.live && adaptive) stream.setDuration(fmt.targetDurationSec)
            else stream.setDuration(parseInt(fmt.approxDurationMs, 10) / 1000)
            const mime = /(video|audio)\/([a-zA-Z0-9]{3,4});(?:\+| )codecs="(.*?)"/.exec(fmt.mimeType)

            if (!mime) continue
            if (!adaptive) stream.setTracks(true, true)
            else if (mime[1] == 'video') stream.setTracks(true, false)
            else stream.setTracks(false, true)
            stream.setBitrate(fmt.bitrate)
            stream.setMetadata(mime[2], mime[3])
            // @ts-expect-error
            stream.default_audio_track = fmt.audioTrack?.audioIsDefault

            ns.push(stream)
        }
        return ns
    }
}

/* api requests and headers to youtube.com */
class YoutubeAPI {
    // ! This is an a modification of the original Youtube.js file from the project.
    Track = YoutubeTrack
    Results = YoutubeResults
    Playlist = YoutubePlaylist
    Music = music

    constructor () {
        this.innertube_client = {
            clientName: 'WEB',
            clientVersion: '2.20220331.06.00',
            gl: 'US',
            hl: 'en',
        }

        this.innertube_key = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'

        this.cookie = ''
        this.sapisid = ''
    }

    /**
     *
     * @param {string} path
     * @param {{[key:string]:any}} [body]
     * @param {string} [query]
     * @param {string} [origin]
     * @returns {Promise<{[key:string]:any}>} //TODO: type this
     */
    async api_request (path, body = {}, query = '', origin = 'www') {
    /* youtube v1 api */
        let time = Date.now()
        /** @type {{[key:string]:any}} */
        const options = { headers: {} }

        body.context = { client: { ...this.innertube_client } }
        options.method = 'POST'
        options.headers.origin = `https://${origin}.youtube.com`

        if (path == 'player') {
            body.contentCheckOk = true
            body.racyCheckOk = true
            body.context.client.clientName = 'ANDROID'
            body.context.client.clientVersion = '18.15.35'
            body.context.client.androidSdkVersion = 33
            options.headers['User-Agent'] = 'com.google.android.youtube/18.15.35'
        }

        if (this.sapisid) {
            let hash

            time = Math.floor(time / 1000)
            hash = crypto
                .createHash('sha1')
                .update(`${time} ${this.sapisid} https://${origin}.youtube.com`)
                .digest('hex')

            options.headers.authorization = 'SAPISIDHASH ' + time + '_' + hash
            options.headers.cookie = this.cookie
        }

        options.body = JSON.stringify(body)

        // @ts-expect-error
        const { res } = await Request.getResponse(
            `https://${origin}.youtube.com/youtubei/v1/${path}?key=${this.innertube_key}${query}&prettyPrint=false`,
            options,
        )
        // @ts-expect-error
        var body

        try {
            // @ts-expect-error
            body = await res.text()
        } catch (e) {
            if (!res.ok) throw new SourceError.INTERNAL_ERROR(null, e)
            throw new SourceError.NETWORK_ERROR(null, e)
        }

        // @ts-expect-error
        if (res.status >= 400 && res.status < 500) throw new SourceError.NOT_FOUND(null, new Error(body))
        // @ts-expect-error
        if (!res.ok) throw new SourceError.INTERNAL_ERROR(null, new Error(body))
        try {
            // @ts-expect-error
            body = JSON.parse(body)
        } catch (e) {
            throw new SourceError.INVALID_RESPONSE(null, e)
        }

        // @ts-expect-error
        return body
    }

    /**
     *
     * @param {string} id
     * @returns {Promise<YoutubeTrack>}
     */
    async get (id) {
        const start = Date.now()
        let responses = [this.api_request('next', { videoId: id }), this.api_request('player', { videoId: id })]

        try {
            // @ts-expect-error
            responses = await Promise.all(responses)
        } catch (e) {
            // @ts-expect-error
            if (e.code == SourceError.codes.NOT_FOUND) e.message = 'Video not found'
            throw e
        }

        const response = responses[0]
        const player_response = responses[1]

        if (!response || !player_response) throw new SourceError.INTERNAL_ERROR(null, new Error('Missing data'))
        // @ts-expect-error
        checkPlayable(player_response.playabilityStatus)

        // @ts-expect-error
        const video_details = player_response.videoDetails

        try {
            const author = getProperty(
                // @ts-expect-error
                response.contents.twoColumnWatchNextResults.results.results.contents,
                'videoSecondaryInfoRenderer',
            ).owner.videoOwnerRenderer

            return new YoutubeTrack().from(video_details, author, new YoutubeStreams().from(start, player_response))
        } catch (e) {
            throw new SourceError.INTERNAL_ERROR(null, e)
        }
    }

    /**
     *
     * @param {string} id
     * @returns {Promise<YoutubeStreams>}
     */
    async get_streams (id) {
        const start = Date.now()
        const player_response = await this.api_request('player', { videoId: id })

        if (!player_response) throw new SourceError.INTERNAL_ERROR(null, new Error('Missing data'))
        // @ts-expect-error
        checkPlayable(player_response.playabilityStatus)

        try {
            return new YoutubeStreams().from(start, player_response)
        } catch (e) {
            throw new SourceError.INTERNAL_ERROR(null, e)
        }
    }

    /**
     *
     * @param {string} id
     * @param {number} [start]
     * @returns {Promise<YoutubePlaylist>}
     */
    async playlist_once (id, start = 0) {
        const results = new YoutubePlaylist()
        const data = await this.api_request('browse', { continuation: genPlaylistContinuation(id, start) })

        if (!data.sidebar) throw new SourceError.NOT_FOUND('Playlist not found')
        if (!data.onResponseReceivedActions) return results
        try {
            const details = getProperty(data.sidebar.playlistSidebarRenderer.items, 'playlistSidebarPrimaryInfoRenderer')

            results.setMetadata(text(details.title), text(details.description))
            results.process(
                id,
                data.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems,
                start,
            )
        } catch (e) {
            throw new SourceError.INTERNAL_ERROR(null, e)
        }

        return results
    }

    /**
     *
     * @param {string} id
     * @param {number} [limit]
     * @returns {Promise<YoutubePlaylist>}
     */
    async playlist (id, limit) {
        let list = null
        let offset = 0

        do {
            const result = await this.playlist_once(id, offset)

            if (!list) list = result
            else list = list.concat(result)
            offset = result.next_offset
        } while (offset && (!limit || list.length < limit))

        // @ts-expect-error
        return list
    }

    /**
     *
     * @param {unknown} query
     * @param {unknown} [continuation]
     * @returns {Promise<YoutubeResults>}
     */
    async search (query, continuation) {
        let body = await this.api_request(
            'search',
            continuation ? { continuation } : { query, params: genSearchOptions({ type: 'video' }) },
        )

        if (continuation) {
            if (!body.onResponseReceivedCommands) throw new SourceError.NOT_FOUND('Search continuation token not found')
            try {
                body = body.onResponseReceivedCommands[0].appendContinuationItemsAction.continuationItems
            } catch (e) {
                throw new SourceError.INTERNAL_ERROR(null, e)
            }
        } else {
            try {
                body = body.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents
            } catch (e) {
                throw new SourceError.INTERNAL_ERROR(null, e)
            }
        }

        const results = new YoutubeResults()

        try {
            // @ts-expect-error
            results.process(body)
        } catch (e) {
            throw new SourceError.INTERNAL_ERROR(null, e)
        }

        return results
    }

    /**
     *
     * @param {string} cookiestr
     * @returns {void}
     */
    set_cookie (cookiestr) {
        if (!cookiestr) {
            this.cookie = ''
            this.sapisid = ''

            return
        }

        const cookies = cookiestr.split(';')
        let sapisid = null

        for (let cookie of cookies) {
            // @ts-expect-error
            cookie = cookie.trim().split('=')

            if (cookie[0] == '__Secure-3PAPISID') sapisid = cookie[1]
            else if (cookie[0] == 'SAPISID') {
                sapisid = cookie[1]

                break
            }
        }

        if (!sapisid) throw new SourceError.INTERNAL_ERROR(null, new Error('Invalid Cookie'))
        this.sapisid = sapisid
        this.cookie = cookiestr
    }

    /**
     *
     * @param {string} big
     * @param {string} small
     * @returns {number}
     */
    string_word_match (big, small) {
    // @ts-expect-error
        const boundary = (c) => /[\s\W]/g.test(c)

        big = big.toLowerCase()
        small = small.toLowerCase()

        if (!big.length || !small.length || boundary(small[0])) return 0
        let l = 0
        let r = small.length

        while (l < r) {
            const mid = (r + l + 1) >> 1

            if (big.includes(small.substring(0, mid))) l = mid
            else r = mid - 1
        }

        if (l == small.length) return l
        for (let i = l - 1; i > 0; i--) if (boundary(small[i])) return i
        return 0
    }

    /**
     *
     * @param {*} track
     * @param {*} result
     * @returns {number}
     */
    track_match_score (track, result) {
        let score = 0

        if (track.duration != -1 && result.duration != -1) {
            const diff = Math.abs(Math.round(track.duration) - Math.round(result.duration))

            if (diff > 5) return 0
            score += 5 - diff
        }

        const length = Math.max(track.artists.length, result.artists ? result.artists.length : 1)

        for (let artist of track.artists) {
            artist = artist.toLowerCase()

            if (!result.artists) {
                if (this.string_word_match(result.author, artist) > 0) {
                    score += 5 * (artist.length / result.author.length)

                    break
                }
            } else {
                for (const result_artist of result.artists) {
                    if (result_artist.toLowerCase() == artist) {
                        score += 5 / length

                        break
                    }
                }
            }
        }

        score += (5 * this.string_word_match(result.title, track.title)) / result.title.length

        return score / 15
    }

    /**
     *
     * @param {*} results
     * @param {*} track
     * @returns {any | null}
     */
    track_match_best (results, track) {
        for (let i = 0; i < results.length; i++) {
            results[i] = {
                score: this.track_match_score(track, results[i]),
                track: results[i],
            }
        }

        // @ts-expect-error
        results = results.filter((match) => match.score >= 0.5)
        // @ts-expect-error
        results.sort((a, b) => b.score - a.score)

        return results.length ? results[0].track : null
    }

    /**
     *
     * @param {*} results
     * @param {*} track
     * @returns {any}
     */
    track_match_best_result (results, track) {
        const list = []
        let result

        if (results.top_result) list.push(results.top_result)
        if (results.songs) list.push(...results.songs)
        result = this.track_match_best(list, track)

        if (result) return result
        return this.track_match_best(results, track)
    }

    /**
     *
     * @param {*} track
     * @returns
     */
    async track_match_lookup (track) {
        const title = [...track.artists, track.title].join(' ')
        // @ts-expect-error
        let results = await music.search(title)
        const expmatch = results.filter((t) => t.explicit == track.explicit)

        if (results.top_result && results.top_result.explicit == track.explicit)
        // @ts-expect-error
        { expmatch.top_result = results.top_result }
        // @ts-expect-error
        if (results.songs) expmatch.songs = results.songs.filter((t) => t.explicit == track.explicit)
        let match = this.track_match_best_result(expmatch, track)

        if (match) return match
        match = this.track_match_best_result(results, track)

        if (match) return match
        // @ts-expect-error
        results = await this.search(title)

        return this.track_match_best_result(results, track)
    }

    /**
     *
     * @param {*} track
     * @returns {Promise<YoutubeStreams>}
     */
    async track_match (track) {
        if (track.youtube_id) {
            try {
                return await this.get_streams(track.youtube_id)
            } catch (e) {
                /* continue */
            }
        }

        let result = await this.track_match_lookup(track)

        if (result) {
            const id = result.id

            result = await result.getStreams()
            track.youtube_id = id

            return result
        }

        // @ts-expect-error
        throw new SourceError.UNPLAYABLE('Could not find streams for this track')
    }
}
const api = new YoutubeAPI()

class YoutubeMusicTrack extends YoutubeTrack {
    constructor () {
    // @ts-expect-error
        super('Youtube')
    }

    /**
     *
     * @param {boolean} [has_type]
     * @param {any[]} [metadata]
     * @returns {{ type: string, artists: any, duration?: number }}
     */
    // ! this code is a modification
    parse_metadata (has_type, metadata = []) {
        let type
        const artists = []
        let duration
        let found = has_type ? 0 : 1

        for (let i = 0; i < metadata.length; i++) {
            const text = metadata[i].text

            if (text == ' • ') {
                found++

                continue
            }

            switch (found) {
                case 0 /* type */:
                    type = text

                    break
                case 1 /* artists */:
                    artists.push(text)

                    if (metadata[i + 1].text != ' • ') i++
                    break
                case 2 /* album */:
                    break
                case 3 /* duration */:
                    duration = parseTimestamp(text)

                    break
            }
        }

        return { type, artists, duration }
    }

    /**
     *
     * @param {*} track
     * @param {boolean} [has_type]
     * @returns
     */
    // @ts-expect-error
    fromSearch (track, has_type) {
        if (!track.playlistItemData) return
        let { type, artists, duration } = this.parse_metadata(
            has_type,
            track.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs,
        )

        if (has_type) {
            type = type.toLowerCase()

            if (type != 'video' && type != 'song') return
            this.type = type
        } else {
            this.type = 'song'
        }

        this.explicit = false
        this.artists = artists

        if (track.badges) {
            for (const badge of track.badges) {
                if (badge.musicInlineBadgeRenderer?.icon?.iconType == 'MUSIC_EXPLICIT_BADGE') {
                    this.explicit = true

                    break
                }
            }
        }

        return this.setOwner(artists.join(', '), null).setMetadata(
            track.playlistItemData.videoId,
            text(track.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text),
            // @ts-expect-error
            duration,
            youtubeThumbnails(track.playlistItemData.videoId),
        )
    }

    // @ts-expect-error
    from_section (track) {
        return this.fromSearch(track, true)
    }
}

class YoutubeMusicResults extends TrackResults {
    /**
     *
     * @param {any | any[]} body
     * @returns
     */
    process (body) {
        if (body instanceof Array) {
            for (const section of body) if (section.musicShelfRenderer) this.process_section(section.musicShelfRenderer)
            return
        }

        this.process_once(body)
    }

    /**
     *
     * @param {*} section
     * @returns {void}
     */
    process_section (section) {
        let section_name = text(section.title)

        if (!section_name) return
        section_name = section_name.toLowerCase()

        switch (section_name) {
            case 'songs':
                if (section.bottomEndpoint) {
                    this.set_browse(
                        section.bottomEndpoint.searchEndpoint.query,
                        section.bottomEndpoint.searchEndpoint.params,
                    )
                }
            case 'top result':
            case 'videos':
                var tracks = this.from_section(section.contents)

                if (section_name == 'top result' && tracks.length) this.top_result = tracks[0]
                if (section_name == 'songs') this.songs = tracks
                this.push(...tracks)

                break
        }
    }

    /**
     *
     * @param {any[]} list
     * @returns
     */
    from_section (list) {
        const tracks = []

        for (let video of list) {
            if (video.musicResponsiveListItemRenderer) {
                video = new YoutubeMusicTrack().from_section(video.musicResponsiveListItemRenderer)

                if (video) tracks.push(video)
            }
        }
        return tracks
    }

    /**
     *
     * @param {*} body
     */
    process_once (body) {
        this.extract_tracks(body.contents)

        if (body.continuations && body.continuations.length) { this.set_continuation(body.continuations[0].nextContinuationData.continuation) }
    }

    /**
     *
     * @param {*} list
     */
    extract_tracks (list) {
        for (let video of list) {
            if (video.musicResponsiveListItemRenderer) {
                video = new YoutubeMusicTrack().fromSearch(video.musicResponsiveListItemRenderer)

                if (video) this.push(video)
            }
        }
    }

    /**
     *
     * @param {*} cont
     */
    set_continuation (cont) {
        this.continuation = cont
    }

    /**
     *
     * @param {*} query
     * @param {*} params
     */
    set_browse (query, params) {
        this.browse = params
        this.query = query
    }

    async next () {
        if (this.browse) return await music.search(this.query, null, this.browse)
        // @ts-expect-error
        if (this.continuation) return await music.search(null, this.continuation)
        return null
    }
}

var music = new (class YoutubeMusic {
    constructor () {
        this.innertube_client = {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20220328.01.00',
            gl: 'US',
            hl: 'en',
        }

        this.innertube_key = 'AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30'
    }

    get cookie () {
        return api.cookie
    }

    get sapisid () {
        return api.sapisid
    }

    /**
     *
     * @param {string} path
     * @param {{[key: string]: any}} [body]
     * @param {string} [query]
     * @returns {Promise<{[key: string]: any}>}
     */
    async api_request (path, body, query) {
        return await api.api_request.call(this, path, body, query, 'music')
    }

    /**
     *
     * @param {string} search
     * @param {*} continuation
     * @param {*} [params]
     * @returns
     */
    async search (search, continuation, params) {
        let query, body

        if (continuation) query = '&continuation=' + continuation + '&type=next'
        else body = { query: search, params }
        body = await this.api_request('search', body, query)

        if (continuation) {
            if (!body.continuationContents) throw new SourceError.NOT_FOUND('Search continuation token not found')
            try {
                body = body.continuationContents.musicShelfContinuation
            } catch (e) {
                throw new SourceError.INTERNAL_ERROR(null, e)
            }
        } else {
            try {
                body =
                    body.contents.tabbedSearchResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents
            } catch (e) {
                throw new SourceError.INTERNAL_ERROR(null, e)
            }

            if (params) body = getProperty(body, 'musicShelfRenderer')
        }

        const results = new YoutubeMusicResults()

        try {
            results.process(body)
        } catch (e) {
            throw new SourceError.INTERNAL_ERROR(null, e)
        }

        return results
    }
})()

export default api

type youtubeTrack = typeof YoutubeTrack
type youtubeResults = typeof YoutubeResults
type youtubePlaylist = typeof YoutubePlaylist
// type youtubeMusic = typeof YoutubeMusic
export {
    youtubeTrack as YoutubeTrack,
    YoutubeTrack as Track,

    YoutubeResults as Results,
    youtubeResults as YoutubeResults,

    YoutubePlaylist as Playlist,
    youtubePlaylist as YoutubePlaylist,

    music as Music,
    // youtubeMusic as YoutubeMusic,
}
