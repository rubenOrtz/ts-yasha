export = api;
declare const api: {
    token: any;
    reloading: Promise<void> | null;
    needs_reload: boolean;
    account_data: {};
    reload(force: any): Promise<void>;
    load(): Promise<void>;
    prefetch(): Promise<void> | undefined;
    api_request(path: any, options?: {}): Promise<any>;
    check_valid_id(id: any): void;
    get(id: any): Promise<SpotifyTrack>;
    get_streams(id: any): Promise<any>;
    search(query: any, start?: number, length?: number): Promise<SpotifyResults>;
    list_once(type: any, id: any, start: number | undefined, length: any): Promise<SpotifyPlaylist>;
    playlist_once(id: any, start: number | undefined, length: any): Promise<SpotifyPlaylist>;
    album_once(id: any, start: number | undefined, length: any): Promise<SpotifyPlaylist>;
    list(type: any, id: any, limit: any): Promise<any[]>;
    playlist(id: any, length: any): Promise<any[]>;
    album(id: any, length: any): Promise<any[]>;
    set_cookie(cookie: any): void;
};
declare class SpotifyTrack extends Track {
    constructor();
    from(track: any, artist: any): this;
    artists: any;
    explicit: any;
    fetch(): Promise<SpotifyTrack>;
    getStreams(): Promise<any>;
    get url(): string;
}
declare class SpotifyResults extends TrackResults {
    set_continuation(query: any, start: any): void;
    query: any;
    start: any;
    next(): Promise<SpotifyResults | null>;
}
declare class SpotifyPlaylist extends TrackPlaylist {
    set(type: any, id: any): void;
    type: any;
    id: any;
    set_continuation(start: any): void;
    start: any;
    next(): Promise<SpotifyPlaylist | null>;
    get url(): string;
}
import { Track } from "../Track";
import { TrackResults } from "../Track";
import { TrackPlaylist } from "../Track";
