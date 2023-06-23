export = Source;
declare class Source {
    static resolve(input: any, weak?: boolean): any;
}
declare namespace Source {
    export { SourceError as Error };
    export { youtube as Youtube };
    export { soundcloud as Soundcloud };
    export { spotify as Spotify };
    export { apple as AppleMusic };
    export { file as File };
}
import SourceError = require("./SourceError");
declare const youtube: {
    Music: any;
    id_regex: RegExp;
    weak_match(id: any): {
        id: any;
    } | null;
    match(content: any): {
        id: any;
    } | null;
    resolve(match: any): Promise<any>;
    weak_resolve(match: any): Promise<any>;
    search(query: any, continuation: any): Promise<any>;
    playlistOnce(id: any, start: any): Promise<any>;
    setCookie(cookie: any): void;
    name: any;
    api: any;
    Track: any;
    Results: any;
    Playlist: any;
    matches(content: any): boolean;
    get(id: any): Promise<any>;
    getStreams(id: any): Promise<any>;
    playlist(id: any, length: any): Promise<any>;
};
declare const soundcloud: {
    match(content: any): {
        soundcloud: string;
        shortlink?: undefined;
    } | {
        shortlink: string;
        soundcloud?: undefined;
    } | null;
    resolve(match: any): Promise<any>;
    search(query: any, offset: any, length: any): Promise<any>;
    playlistOnce(id: any, offset: any, length: any): Promise<any>;
    name: any;
    api: any;
    Track: any;
    Results: any;
    Playlist: any;
    weak_match(content: any): null;
    matches(content: any): boolean;
    get(id: any): Promise<any>;
    getStreams(id: any): Promise<any>;
    playlist(id: any, length: any): Promise<any>;
};
declare const spotify: {
    match(content: any): {
        track: string;
        album?: undefined;
        playlist?: undefined;
    } | {
        album: string;
        track?: undefined;
        playlist?: undefined;
    } | {
        playlist: string;
        track?: undefined;
        album?: undefined;
    } | null;
    resolve(match: any): Promise<any>;
    search(query: any, offset: any, length: any): Promise<any>;
    playlistOnce(id: any, offset: any, length: any): Promise<any>;
    albumOnce(id: any, offset: any, length: any): Promise<any>;
    setCookie(cookie: any): void;
    name: any;
    api: any;
    Track: any;
    Results: any;
    Playlist: any;
    weak_match(content: any): null;
    matches(content: any): boolean;
    get(id: any): Promise<any>;
    getStreams(id: any): Promise<any>;
    playlist(id: any, length: any): Promise<any>;
};
declare const apple: {
    match(content: any): {
        track: string;
        playlist?: undefined;
        album?: undefined;
    } | {
        playlist: string;
        track?: undefined;
        album?: undefined;
    } | {
        album: string;
        track?: undefined;
        playlist?: undefined;
    } | null;
    resolve(match: any): Promise<any>;
    search(query: any, offset: any, length: any): Promise<any>;
    playlistOnce(id: any, offset: any, length: any): Promise<any>;
    albumOnce(id: any, offset: any, length: any): Promise<any>;
    name: any;
    api: any;
    Track: any;
    Results: any;
    Playlist: any;
    weak_match(content: any): null;
    matches(content: any): boolean;
    get(id: any): Promise<any>;
    getStreams(id: any): Promise<any>;
    playlist(id: any, length: any): Promise<any>;
};
declare const file: {
    resolve(content: any): any;
    name: any;
    api: any;
    Track: any;
    Results: any;
    Playlist: any;
    match(content: any): null;
    weak_match(content: any): null;
    matches(content: any): boolean;
    get(id: any): Promise<any>;
    getStreams(id: any): Promise<any>;
    search(query: any): Promise<null>;
    playlistOnce(id: any): Promise<null>;
    playlist(id: any, length: any): Promise<any>;
};
