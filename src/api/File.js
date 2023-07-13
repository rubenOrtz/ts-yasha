// @ts-check
const { Track, TrackStream, TrackStreams, TrackPlaylist } = require('../Track')
const SourceError = require('../SourceError')
// ! This is an a modification of the original File.js file from the project.
const Source = require('../Source')

class FileStream extends TrackStream {
    /**
     * @type {boolean}
     * @private
     */
    is_file
    /**
     *
     * @param {string} url
     * @param {boolean} isfile
     */
    constructor(url, isfile) {
        super(url)

        this.is_file = isfile
        this.setTracks(true, true) /* we don't know what kind of tracks are in this file */
    }

    /**
     *
     * @param {FileStream} other
     * @returns {boolean}
     */
    equals(other) {
        return !!(other instanceof FileStream && this.url && this.url == other.url)
    }
}

class FileStreams extends TrackStreams {
    /**
     *
     * @param {string} url
     * @param {boolean} isfile
     * @returns {this}
     */
    from(url, isfile) {
        this.push(new FileStream(url, isfile))

        return this
    }
}

/** @extends {Track<'File'>} */
class FileTrack extends Track {
    /**
     * @type {string}
     * @private
     */
    stream_url
    /** @type {boolean} */
    isLocalFile
    /**
     *
     * @param {string} url
     * @param {boolean} [isfile]
     */
    constructor(url, isfile = false) {
        super('File')

        this.stream_url = url
        this.id = url
        this.isLocalFile = isfile
        this.setStreams(new FileStreams().from(url, isfile))
    }

    /**
     * @returns {Promise<never>}
     */
    async getStreams() {
        // @ts-ignore
        throw new SourceError.UNPLAYABLE('Stream expired or not available')
    }

    /**
     * @returns {Promise<never>}
     */
    async fetch() {
        // @ts-ignore
        throw new SourceError.INTERNAL_ERROR(null, new Error('Cannot fetch on a FileTrack'))
    }

    /**
     * @returns {string}
     */
    get url() {
        return this.stream_url
    }
}

class File {
    // ! This is an a modification of the original File.js file from the project.
    Track = FileTrack

    /**
     *
     * @param {string} url
     * @returns {Promise<never>}
     */
    async get(url) {
        throw new Error('Unsupported')
    }

    /**
     *
     * @param {string} url
     * @returns {Promise<never>}
     */
    async get_streams(url) {
        throw new Error('Unsupported')
    }

    /**
     *
     * @param {string} url
     * @param {number} [length]
     * @returns {Promise<never>}
     */
    async playlist(url, length) {
        throw new Error('Unsupported')
    }

    /**
     *
     * @param {string} url
     * @param {boolean} [isfile]
     * @returns {FileTrack}
     */
    create(url, isfile) {
        return new FileTrack(url, isfile)
    }
}

module.exports = new File()
module.exports.Track = FileTrack
