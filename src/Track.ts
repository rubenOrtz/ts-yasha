export class TrackStream {
    #url
    video
    audio
    bitrate
    duration
    container: unknown
    codecs: unknown

    constructor (url: string) {
        this.#url = url
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

    get url (): string {
        return this.#url
    }
}

export class TrackStreams extends Array<TrackStream> {
    volume = 100
    live = false
    time = 0

    constructor ({ volume, live, time }: { volume?: number, live?: boolean, time?: number } = {}) {
        super()

        this.volume = volume ?? 100
        this.live = live ?? false
        this.time = time ?? 0
    }

    expired (): boolean {
        return false
    }

    maybeExpired (): boolean {
        return false
    }
}

export class Track<T extends string> {
    icons: TrackImage[]
    playable = true
    duration = -1
    platform: T
    author
    title
    id
    streams: TrackStreams = new TrackStreams()
    thumbnails: unknown

    constructor (platform: T, id: string, title: string, author: string, icons?: TrackImage[]) {
        this.platform = platform
        this.id = id
        this.author = author
        this.title = title
        this.icons = icons ?? []
    }

    setMetadata (id: string, title: string, duration: number, thumbnails: unknown): this {
        this.id = id
        this.title = title
        this.duration = duration
        this.thumbnails = thumbnails

        return this
    }

    setStreams (streams: TrackStream[]): this {
        this.streams.concat(streams)

        return this
    }

    setPlayable (playable: boolean): this {
        this.playable = playable

        return this
    }

    async fetch (): Promise<null> {
        return null
    }

    async getStreams (): Promise<null> {
        return null
    }

    get url (): null {
        return null
    }

    equals (other: Track<any>): boolean {
        return this === other || (this.platform === other.platform && this.id != null && this.id === other.id)
    }
}

export class TrackResults<T extends string> extends Array<Track<T>> {

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

    get url (): null {
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

    static from (array: Array<{ url: string, width: number, height: number }>): TrackImage[] {
        const newArray = []
        for (const ti of array) newArray.push(new TrackImage(ti.url, ti.width, ti.height))
        return array
    }
}
