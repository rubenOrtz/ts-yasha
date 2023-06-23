export class Track {
    constructor(platform: any);
    platform: any;
    playable: boolean;
    duration: number;
    setOwner(name: any, icons: any): this;
    author: any;
    icons: any;
    setMetadata(id: any, title: any, duration: any, thumbnails: any): this;
    id: any;
    title: any;
    thumbnails: any;
    setStreams(streams: any): this;
    streams: any;
    setPlayable(playable: any): this;
    fetch(): Promise<null>;
    getStreams(): Promise<null>;
    get url(): null;
    equals(other: any): boolean;
}
export class TrackResults extends Array<any> {
    constructor(arrayLength?: number | undefined);
    constructor(arrayLength: number);
    constructor(...items: any[]);
    next(): Promise<null>;
}
export class TrackPlaylist extends TrackResults {
    setMetadata(title: any, description: any): this;
    title: any;
    description: any;
    setFirstTrack(track: any): this;
    firstTrack: any;
    load(): Promise<this>;
    get url(): null;
}
export class TrackImage {
    static from(array: any): any;
    constructor(url: any, width: any, height: any);
    url: any;
    width: any;
    height: any;
}
export class TrackStream {
    constructor(url: any);
    url: any;
    video: boolean;
    audio: boolean;
    bitrate: number;
    duration: number;
    container: any;
    codecs: any;
    setTracks(video: any, audio: any): this;
    setBitrate(bitrate: any): this;
    setDuration(duration: any): this;
    setMetadata(container: any, codecs: any): this;
    equals(other: any): boolean;
    getUrl(): Promise<null>;
}
export class TrackStreams extends Array<any> {
    constructor(arrayLength?: number | undefined);
    constructor(arrayLength: number);
    constructor(...items: any[]);
    set(volume: any, live: any, time: any): void;
    volume: any;
    live: any;
    time: any;
    expired(): boolean;
    maybeExpired(): boolean;
}
