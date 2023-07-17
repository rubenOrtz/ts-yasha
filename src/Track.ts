export class TrackStream {
    url
    video
    audio
    bitrate
    duration
    container: unknown
    codecs: unknown

    constructor (url: string) {
        this.url = url
        this.video = false
        this.audio = false
        this.bitrate = -1
        this.duration = -1
        this.container = null
        this.codecs = null
    }

    setTracks (video: boolean, audio: boolean): this {
        this.video = video
        this.audio = audio

        return this
    }

    setBitrate (bitrate: number): this {
        this.bitrate = bitrate

        return this
    }

    setDuration (duration: number): this {
        this.duration = duration

        return this
    }

    setMetadata (container: unknown, codecs: unknown): this {
        this.container = container
        this.codecs = codecs

        return this
    }

    equals (other: TrackStream): boolean {
        return this === other || (this.url === other.url && this.video === other.video && this.audio === other.audio)
    }

    async getUrl (): Promise<unknown> {
        return null
    }
}

export class TrackStreams extends Array<TrackStream> {
    volume = 100
    live = false
    time = 0

    set (volume: number, live: boolean, time: number): void {
        this.volume = volume
        this.live = live
        this.time = time
    }

    expired (): boolean {
        return false
    }

    maybeExpired (): boolean {
        return false
    }
}

export class Track<T extends string> {
    icons?: TrackImage[]
    playable = true
    duration = -1
    platform: T
    author?: string
    title?: string
    id?: string
    streams?: TrackStreams
    thumbnails: TrackImage[] = []

    constructor (platform: T) {
        this.platform = platform
    }

    setOwner (name: string, icons: TrackImage[]): this {
        this.author = name
        this.icons = icons

        return this
    }

    setMetadata (id: string, title: string, duration: number, thumbnails: TrackImage[]): this {
        this.id = id
        this.title = title
        this.duration = duration
        this.thumbnails = thumbnails

        return this
    }

    setStreams (streams: TrackStreams): this {
        this.streams = streams

        return this
    }

    setPlayable (playable: boolean): this {
        this.playable = playable

        return this
    }

    async fetch (): Promise<unknown> {
        return null
    }

    async getStreams (): Promise<unknown> {
        return null
    }

    get url (): unknown {
        return null
    }

    equals (other: Track<any>): boolean {
        return this === other || (this.platform === other.platform && this.id != null && this.id === other.id)
    }
}

export class TrackResults<T extends string> extends Array<Track<T>> {
    async next (): Promise<unknown> {
        return null
    }
}

export class TrackPlaylist<T extends string> extends TrackResults<T> {
    title
    description
    firstTrack?: Track<T>

    constructor (title = '', description = '') {
        super()

        this.title = title
        this.description = description
    }

    setFirstTrack (track: Track<T>): this {
        this.firstTrack = track

        return this
    }

    async next (): Promise<any> {
        return null
    }

    async load (): Promise<this> {
        let result = await this.next()

        while (result?.length) {
            this.push(...result)
            result = await result.next()
        }

        if (this.firstTrack) {
            const index = this.findIndex(track => track.equals(this.firstTrack as Track<any>))

            if (index === -1) this.unshift(this.firstTrack)
            else this.splice(0, index)
        }

        return this
    }

    get url (): unknown {
        return null
    }
}

export class TrackImage {
    url
    width
    height

    constructor (url: string, width: number, height: number) {
        this.url = url ?? null
        this.width = width ?? 0
        this.height = height ?? 0
    }

    static from (array: ImageDetails[]): ImageDetails[] {
        const newArray: ImageDetails[] = []
        if (!array) return newArray
        for (const ti of array) newArray.push(new TrackImage(ti.url, ti.width, ti.height))
        return array
    }
}

export interface ImageDetails { url: string, width: number, height: number }
