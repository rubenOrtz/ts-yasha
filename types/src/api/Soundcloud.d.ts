export = api;
declare var api: {
    client_id: string | null;
    reloading: Promise<void> | null;
    reload(): Promise<void>;
    prefetch(): Promise<void>;
    load(): Promise<void>;
    request(path: any, query?: {}): Promise<any>;
    api_request(path: any, query: any): Promise<any>;
    resolve_playlist(list: any, offset: number | undefined, limit: any): Promise<SoundcloudPlaylist | null>;
    resolve(url: any): Promise<SoundcloudTrack | SoundcloudPlaylist | null>;
    resolve_shortlink(id: any): Promise<SoundcloudTrack | SoundcloudPlaylist | null>;
    check_valid_id(id: any): void;
    get(id: any): Promise<SoundcloudTrack>;
    get_streams(id: any): Promise<SoundcloudStreams>;
    search(query: any, offset: any, limit?: number): Promise<SoundcloudResults>;
    playlist_once(id: any, offset?: number, limit?: number): Promise<SoundcloudPlaylist | null>;
    playlist(id: any, limit: any): Promise<SoundcloudPlaylist | null>;
};
declare class SoundcloudPlaylist extends TrackPlaylist {
    from(list: any): this;
    permalink_url: any;
    set_continuation(id: any, start: any): void;
    id: any;
    start: any;
    get url(): any;
    next(): Promise<SoundcloudPlaylist | null>;
}
declare class SoundcloudTrack extends Track {
    constructor();
    from(track: any): this;
    permalink_url: any;
    get_thumbnails(track: any): ({
        width: number;
        height: number;
        url: any;
    } | {
        width: number[];
        height: number[];
        url: any;
    })[];
    fetch(): Promise<SoundcloudTrack>;
    getStreams(): Promise<SoundcloudStreams>;
    get url(): any;
}
declare class SoundcloudStreams extends TrackStreams {
    from(track: any): this;
    extract_streams(streams: any): void;
}
declare class SoundcloudResults extends TrackResults {
    set_continuation(query: any, start: any): void;
    query: any;
    start: any;
    next(): Promise<SoundcloudResults>;
}
import { TrackPlaylist } from "../Track";
import { Track } from "../Track";
import { TrackStreams } from "../Track";
import { TrackResults } from "../Track";
