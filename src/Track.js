class TrackStream {
    /** @type {string | null} */
    url
    /** @type {boolean} */
    video
    /** @type {boolean} */
    audio
    /** @type {number} */
    bitrate
    /** @type {number} */
    duration
    /** @type {any | null} */
    container
    /** @type {any | null} */
    codecs

    /**
     *
     * @param {string | null} url
     */
    constructor(url) {
        this.url = url
        this.video = false
        this.audio = false
        this.bitrate = -1
        this.duration = -1
        this.container = null
        this.codecs = null
    }

    /**
     *
     * @param {boolean} video
     * @param {boolean} audio
     * @returns {this}
     */
    setTracks(video, audio) {
        this.video = video
        this.audio = audio

        return this
    }

    /**
     *
     * @param {number} bitrate
     * @returns {this}
     */
    setBitrate(bitrate) {
        this.bitrate = bitrate

        return this
    }

    /**
     *
     * @param {number} duration
     * @returns {this}
     */
    setDuration(duration) {
        this.duration = duration

        return this
    }

    /**
     *
     * @param {any} container
     * @param {any} codecs
     * @returns {this}
     */
    setMetadata(container, codecs) {
        this.container = container
        this.codecs = codecs

        return this
    }

    /**
     *
     * @param {TrackStream} other
     * @returns {boolean}
     */
    equals(other) {
        return this == other
    }

    /**
     *
     * @returns {Promise<string | null>}
     */
    async getUrl() {
        return null
    }
}

class TrackStreams extends Array {
    /**
     *
     * @param {number} volume
     * @param {any} live
     * @param {number} time
     */
    set(volume, live, time) {
        this.volume = volume
        this.live = live
        this.time = time
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

/**
 * @template T extends 'Spotify' | 'Soundcloud' | 'File' | 'AppleMusic' | 'Youtube'
 */
class Track {
    /** @type {T} */
    platform
    /** @type {boolean} */
    playable
    /** @type {number} */
    duration
    /** @type {unknown} */
    streams
    /** @type {string | undefined} */
    author
    /** @type {any | undefined} */
    icons
    /** @type {string | null} */
    id
    /** @type {string | undefined} */
    title
    /** @type {any | undefined} */
    thumbnails
    /**
     *
     * @param {T} platform
     */
    constructor(platform) {
        this.platform = platform
        this.playable = true
        this.duration = -1
    }

    /**
     *
     * @param {string} name
     * @param {*} icons
     * @returns {this}
     */
    setOwner(name, icons) {
        this.author = name
        this.icons = icons

        return this
    }

    /**
     *
     * @param {string} id
     * @param {string} title
     * @param {number} duration
     * @param {*} thumbnails
     * @returns {this}
     */
    setMetadata(id, title, duration, thumbnails) {
        this.id = id
        this.title = title
        this.duration = duration
        this.thumbnails = thumbnails

        return this
    }

    /**
     *
     * @param {*} streams
     * @returns {this}
     */
    setStreams(streams) {
        this.streams = streams

        return this
    }

    /**
     *
     * @param {boolean} playable
     * @returns {this}
     */
    setPlayable(playable) {
        this.playable = playable

        return this
    }

    /**
     *
     * @returns {Promise<unknown>}
     */
    async fetch() {
        return null
    }

    /**
     *
     * @returns {Promise<unknown>}
     */
    async getStreams() {
        return null
    }

    /**
     * @returns {string | null}
     */
    get url() {
        return null
    }

    /**
     *
     * @param {Track<any>} other
     * @returns {boolean}
     */
    equals(other) {
        return this == other || (this.platform == other.platform && this.id != null && this.id == other.id)
    }
}

class TrackResults extends Array {
    /**
     *
     * @returns {Promise<unknown | null>}
     */
    async next() {
        return null
    }
}

class TrackPlaylist extends TrackResults {
    /** @type {string | undefined} */
    title
    /** @type {string | undefined} */
    description
    /** @type {Track | undefined} */
    firstTrack

    /**
     *
     * @param {string} title
     * @param {string} description
     * @returns {this}
     */
    setMetadata(title, description) {
        this.title = title
        this.description = description

        return this
    }

    /**
     *
     * @param {Track<any>} track
     * @returns {this}
     */
    setFirstTrack(track) {
        this.firstTrack = track

        return this
    }

    /**
     *
     * @returns {Promise<unknown | null>}
     */
    async next() {
        return null
    }

    /**
     *
     * @returns {Promise<this>}
     */
    async load() {
        let result

        result = await this.next()

        while (result && result.length) {
            this.push(...result)
            // @ts-ignore
            result = await result.next()
        }

        if (this.firstTrack) {
            const index = this.findIndex((track) => track.equals(this.firstTrack))

            if (index == -1) this.unshift(this.firstTrack)
            else this.splice(0, index)
        }

        return this
    }

    /** @returns {string | null} */
    get url() {
        return null
    }
}

class TrackImage {
    /** @type {string} */
    url
    /** @type {number} */
    width
    /** @type {number} */
    height

    /**
     *
     * @param {string} url
     * @param {number} width
     * @param {number} height
     */
    constructor(url, width, height) {
        this.url = url ?? null
        this.width = width ?? 0
        this.height = height ?? 0
    }

    /**
     *
     * @param {{url:string;width:number;height:number}[]} array
     * @returns {TrackImage[]}
     */
    static from(array) {
        if (!array) return []
        for (var i = 0; i < array.length; i++) array[i] = new TrackImage(array[i].url, array[i].width, array[i].height)
        return array
    }
}

module.exports = { Track, TrackResults, TrackPlaylist, TrackImage, TrackStream, TrackStreams }
