export = api;
declare const api: {
    token: string | null;
    reloading: null | Promise<void>;
    needs_reload: boolean;
    reload(force?: boolean | undefined): Promise<void>;
    load(): Promise<void>;
    prefetch(): Promise<void> | undefined;
    api_request(path: string, query?: {
        [key: string]: any;
    } | undefined, options?: {
        [key: string]: any;
        headers?: {
            [key: string]: any;
            authorization?: string | undefined;
            origin?: string | undefined;
        } | undefined;
    } | undefined): Promise<any>;
    check_valid_id(id: string): void;
    get(id: string): Promise<AppleMusicTrack>;
    get_streams(id: string): Promise<any>;
    get_next(url: string, param: any): number;
    search(query: any, offset?: number | undefined, limit?: number | undefined): Promise<AppleMusicResults>;
    list_once(type: string, id: string, offset?: number | undefined, limit?: number | undefined): Promise<AppleMusicPlaylist>;
    check_valid_playlist_id(id: string): void;
    playlist_once(id: string, offset?: number | undefined, length?: number | undefined): Promise<AppleMusicPlaylist>;
    album_once(id: string, offset?: number | undefined, length?: number | undefined): Promise<AppleMusicPlaylist>;
    list(type: string, id: string, limit?: number | undefined): Promise<AppleMusicPlaylist>;
    playlist(id: string, length?: number | undefined): Promise<AppleMusicPlaylist>;
    album(id: string, length?: number | undefined): Promise<AppleMusicPlaylist>;
};
declare class AppleMusicTrack extends Track {
    constructor();
    artists: string[];
    explicit: boolean;
    protected gen_image(url: string, artist?: boolean | undefined): [TrackImage];
    from(track: any): this;
    fetch(): Promise<AppleMusicTrack>;
    get url(): string;
}
declare class AppleMusicResults extends TrackResults {
    query: any | null;
    start: number | undefined;
    protected set_continuation(query: any, start: number): void;
    next(): Promise<AppleMusicResults | null>;
}
declare class AppleMusicPlaylist extends TrackPlaylist {
    type: string | undefined;
    id: string | undefined;
    start: number | undefined;
    set(type: string, id: string): void;
    protected set_continuation(start: any): void;
    next(): Promise<AppleMusicPlaylist | null>;
    get url(): string;
}
import { Track } from "../Track";
import { TrackImage } from "../Track";
import { TrackResults } from "../Track";
import { TrackPlaylist } from "../Track";
