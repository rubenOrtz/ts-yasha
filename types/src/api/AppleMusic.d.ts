export = api;
declare const api: {
    token: any;
    reloading: Promise<void> | null;
    needs_reload: boolean;
    reload(force: any): Promise<void>;
    load(): Promise<void>;
    prefetch(): Promise<void> | undefined;
    api_request(path: any, query?: {}, options?: {}): Promise<any>;
    check_valid_id(id: any): void;
    get(id: any): Promise<AppleMusicTrack>;
    get_streams(id: any): Promise<any>;
    get_next(url: any, param: any): number;
    search(query: any, offset?: number, limit?: number): Promise<AppleMusicResults>;
    list_once(type: any, id: any, offset?: number, limit?: number): Promise<AppleMusicPlaylist>;
    check_valid_playlist_id(id: any): void;
    playlist_once(id: any, offset: any, length: any): Promise<AppleMusicPlaylist>;
    album_once(id: any, offset: any, length: any): Promise<AppleMusicPlaylist>;
    list(type: any, id: any, limit: any): Promise<any[]>;
    playlist(id: any, length: any): Promise<any[]>;
    album(id: any, length: any): Promise<any[]>;
};
declare class AppleMusicTrack extends Track {
    constructor();
    gen_image(url: any, artist: any): TrackImage[];
    from(track: any): this;
    artists: any;
    explicit: boolean | undefined;
    fetch(): Promise<AppleMusicTrack>;
    getStreams(): Promise<any>;
    get url(): string;
}
declare class AppleMusicResults extends TrackResults {
    set_continuation(query: any, start: any): void;
    query: any;
    start: any;
    next(): Promise<AppleMusicResults | null>;
}
declare class AppleMusicPlaylist extends TrackPlaylist {
    set(type: any, id: any): void;
    type: any;
    id: any;
    set_continuation(start: any): void;
    start: any;
    next(): Promise<AppleMusicPlaylist | null>;
    get url(): string;
}
import { Track } from "../Track";
import { TrackImage } from "../Track";
import { TrackResults } from "../Track";
import { TrackPlaylist } from "../Track";
