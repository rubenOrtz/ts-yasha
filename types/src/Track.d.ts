export class Track {
    /**
     *
     * @param {string} platform
     */
    constructor(platform: string);
    /** @type {string} */
    platform: string;
    /** @type {boolean} */
    playable: boolean;
    /** @type {number} */
    duration: number;
    /** @type {unknown} */
    streams: unknown;
    /** @type {string | undefined} */
    author: string | undefined;
    /** @type {any | undefined} */
    icons: any | undefined;
    /** @type {string | undefined} */
    id: string | undefined;
    /** @type {string | undefined} */
    title: string | undefined;
    /** @type {any | undefined} */
    thumbnails: any | undefined;
    /**
     *
     * @param {string} name
     * @param {*} icons
     * @returns {this}
     */
    setOwner(name: string, icons: any): this;
    /**
     *
     * @param {string} id
     * @param {string} title
     * @param {number} duration
     * @param {*} thumbnails
     * @returns {this}
     */
    setMetadata(id: string, title: string, duration: number, thumbnails: any): this;
    /**
     *
     * @param {*} streams
     * @returns {this}
     */
    setStreams(streams: any): this;
    /**
     *
     * @param {boolean} playable
     * @returns {this}
     */
    setPlayable(playable: boolean): this;
    /**
     *
     * @returns {Promise<unknown>}
     */
    fetch(): Promise<unknown>;
    /**
     *
     * @returns {Promise<unknown>}
     */
    getStreams(): Promise<unknown>;
    /**
     * @returns {string | null}
     */
    get url(): string | null;
    /**
     *
     * @param {Track} other
     * @returns {boolean}
     */
    equals(other: Track): boolean;
}
export class TrackResults extends Array<any> {
    constructor(arrayLength?: number | undefined);
    constructor(arrayLength: number);
    constructor(...items: any[]);
    /**
     *
     * @returns {Promise<unknown | null>}
     */
    next(): Promise<unknown | null>;
}
export class TrackPlaylist extends TrackResults {
    /** @type {string | undefined} */
    title: string | undefined;
    /** @type {string | undefined} */
    description: string | undefined;
    /** @type {Track | undefined} */
    firstTrack: Track | undefined;
    /**
     *
     * @param {string} title
     * @param {string} description
     * @returns {this}
     */
    setMetadata(title: string, description: string): this;
    /**
     *
     * @param {Track} track
     * @returns {this}
     */
    setFirstTrack(track: Track): this;
    /**
     *
     * @returns {Promise<this>}
     */
    load(): Promise<this>;
    /** @returns {string | null} */
    get url(): string | null;
}
export class TrackImage {
    /**
     *
     * @param {{url:string;width:number;height:number}[]} array
     * @returns {TrackImage[]}
     */
    static from(array: {
        url: string;
        width: number;
        height: number;
    }[]): TrackImage[];
    /**
     *
     * @param {string} url
     * @param {number} width
     * @param {number} height
     */
    constructor(url: string, width: number, height: number);
    /** @type {string} */
    url: string;
    /** @type {number} */
    width: number;
    /** @type {number} */
    height: number;
}
export class TrackStream {
    /**
     *
     * @param {string} url
     */
    constructor(url: string);
    /** @type {string} */
    url: string;
    /** @type {boolean} */
    video: boolean;
    /** @type {boolean} */
    audio: boolean;
    /** @type {number} */
    bitrate: number;
    /** @type {number} */
    duration: number;
    /** @type {any | null} */
    container: any | null;
    /** @type {any | null} */
    codecs: any | null;
    /**
     *
     * @param {boolean} video
     * @param {boolean} audio
     * @returns {this}
     */
    setTracks(video: boolean, audio: boolean): this;
    /**
     *
     * @param {number} bitrate
     * @returns {this}
     */
    setBitrate(bitrate: number): this;
    /**
     *
     * @param {number} duration
     * @returns {this}
     */
    setDuration(duration: number): this;
    /**
     *
     * @param {any} container
     * @param {any} codecs
     * @returns {this}
     */
    setMetadata(container: any, codecs: any): this;
    /**
     *
     * @param {TrackStream} other
     * @returns {boolean}
     */
    equals(other: TrackStream): boolean;
    /**
     *
     * @returns {Promise<string | null>}
     */
    getUrl(): Promise<string | null>;
}
export class TrackStreams extends Array<any> {
    constructor(arrayLength?: number | undefined);
    constructor(arrayLength: number);
    constructor(...items: any[]);
    /**
     *
     * @param {number} volume
     * @param {any} live
     * @param {number} time
     */
    set(volume: number, live: any, time: number): void;
    volume: number | undefined;
    live: any;
    time: number | undefined;
    /**
     *
     * @returns {boolean}
     */
    expired(): boolean;
    /**
     *
     * @returns {boolean}
     */
    maybeExpired(): boolean;
}
