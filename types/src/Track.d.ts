export class Track {
    constructor(platform: string);
    platform: string;
    playable: boolean;
    duration: number;
    streams: unknown;
    author: string | undefined;
    icons: any | undefined;
    id: string | null;
    title: string | undefined;
    thumbnails: any | undefined;
    setOwner(name: string, icons: any): this;
    setMetadata(id: string, title: string, duration: number, thumbnails: any): this;
    setStreams(streams: any): this;
    setPlayable(playable: boolean): this;
    fetch(): Promise<unknown>;
    getStreams(): Promise<unknown>;
    get url(): string | null;
    equals(other: Track): boolean;
}
export class TrackResults extends Array<any> {
    constructor(arrayLength?: number | undefined);
    constructor(arrayLength: number);
    constructor(...items: any[]);
    next(): Promise<unknown | null>;
}
export class TrackPlaylist extends TrackResults {
    title: string | undefined;
    description: string | undefined;
    firstTrack: Track | undefined;
    setMetadata(title: string, description: string): this;
    setFirstTrack(track: Track): this;
    load(): Promise<this>;
    get url(): string | null;
}
export class TrackImage {
    static from(array: {
        url: string;
        width: number;
        height: number;
    }[]): TrackImage[];
    constructor(url: string, width: number, height: number);
    url: string;
    width: number;
    height: number;
}
export class TrackStream {
    constructor(url: string | null);
    url: string | null;
    video: boolean;
    audio: boolean;
    bitrate: number;
    duration: number;
    container: any | null;
    codecs: any | null;
    setTracks(video: boolean, audio: boolean): this;
    setBitrate(bitrate: number): this;
    setDuration(duration: number): this;
    setMetadata(container: any, codecs: any): this;
    equals(other: TrackStream): boolean;
    getUrl(): Promise<string | null>;
}
export class TrackStreams extends Array<any> {
    constructor(arrayLength?: number | undefined);
    constructor(arrayLength: number);
    constructor(...items: any[]);
    set(volume: number, live: any, time: number): void;
    volume: number | undefined;
    live: any;
    time: number | undefined;
    expired(): boolean;
    maybeExpired(): boolean;
}
