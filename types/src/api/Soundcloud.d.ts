export = api;
declare var api: {
    client_id: string | null;
    reloading: Promise<void> | null;
    reload(): Promise<void>;
    prefetch(): Promise<void>;
    load(): Promise<void>;
    request(path: string, query?: {
        [key: string]: string | null;
    } | undefined): Promise<any>;
    api_request(path: string, query?: {
        [key: string]: any;
    } | undefined): Promise<any>;
    resolve_playlist(list: {
        tracks: {
            id: string;
            streamable: boolean;
        }[];
        permalink_url: string;
        title: string;
        description: string;
        id: string;
    }, offset: number | undefined, limit: number): Promise<SoundcloudPlaylist | null>;
    resolve(url: string): Promise<SoundcloudTrack | SoundcloudPlaylist | null>;
    resolve_shortlink(id: string): Promise<SoundcloudTrack | SoundcloudPlaylist | null>;
    check_valid_id(id: string): void;
    get(id: string): Promise<SoundcloudTrack | SoundcloudPlaylist | null>;
    get_streams(id: string): Promise<SoundcloudStreams>;
    search(query: string, offset: number, limit?: number | undefined): Promise<SoundcloudResults>;
    playlist_once(id: string, offset?: number | undefined, limit?: number | undefined): Promise<SoundcloudPlaylist | null>;
    playlist(id: string, limit?: number | undefined): Promise<SoundcloudPlaylist | null>;
};
declare class SoundcloudPlaylist extends TrackPlaylist {
    id: string | undefined;
    start: number | undefined;
    private permalink_url;
    from(list: {
        permalink_url: string;
        title: string;
        description: string;
    }): this;
    set_continuation(id: string, start: number): void;
    get url(): string | undefined;
    next(): Promise<SoundcloudPlaylist | null>;
}
declare class SoundcloudTrack extends Track {
    constructor();
    protected permalink_url: string | null;
    from(track: any): this;
    get_thumbnails(track: any): {
        width: number;
        height: number;
        url: string;
    }[];
    fetch(): Promise<SoundcloudTrack>;
    getStreams(): Promise<SoundcloudStreams>;
}
declare class SoundcloudStreams extends TrackStreams {
    from(track: {
        media: {
            transcodings: {
                format: {
                    mime_type: string;
                };
                url: string;
                duration: number;
            }[];
        };
    }): this;
    extract_streams(streams: {
        format: {
            mime_type: string;
        };
        url: string;
        duration: number;
    }[]): void;
}
declare class SoundcloudResults extends TrackResults {
    query: any;
    start: number;
    set_continuation(query: any, start: number): void;
    next(): Promise<SoundcloudResults>;
}
import { TrackPlaylist } from "../Track";
import { Track } from "../Track";
import { TrackStreams } from "../Track";
import { TrackResults } from "../Track";
