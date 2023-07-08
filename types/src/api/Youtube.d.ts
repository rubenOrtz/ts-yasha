export = api;
declare const api: {
    Track: typeof YoutubeTrack;
    Results: typeof YoutubeResults;
    Playlist: typeof YoutubePlaylist;
    Music: {
        innertube_client: {
            clientName: string;
            clientVersion: string;
            gl: string;
            hl: string;
        };
        innertube_key: string;
        readonly cookie: string;
        readonly sapisid: string;
        api_request(path: any, body: any, query: any): Promise<{
            [key: string]: any;
        }>;
        search(search: any, continuation: any, params: any): Promise<YoutubeMusicResults>;
    };
    innertube_client: {
        clientName: string;
        clientVersion: string;
        gl: string;
        hl: string;
    };
    innertube_key: string;
    cookie: string;
    sapisid: string;
    api_request(path: string, body?: {
        [key: string]: any;
    } | undefined, query?: string | undefined, origin?: string | undefined): Promise<{
        [key: string]: any;
    }>;
    get(id: string): Promise<YoutubeTrack>;
    get_streams(id: string): Promise<YoutubeStreams>;
    playlist_once(id: any, start?: number): Promise<YoutubePlaylist>;
    playlist(id: string, limit?: number | undefined): Promise<YoutubePlaylist>;
    search(query: any, continuation: any): Promise<YoutubeResults>;
    set_cookie(cookiestr: any): void;
    string_word_match(big: any, small: any): number;
    track_match_score(track: any, result: any): number;
    track_match_best(results: any, track: any): any;
    track_match_best_result(results: any, track: any): any;
    track_match_lookup(track: any): Promise<any>;
    track_match(track: any): Promise<any>;
};
declare class YoutubeTrack extends Track<any> {
    constructor();
    from(video_details: any, author: any, streams: any): this;
    from_search(track: any): this;
    from_playlist(track: any): this;
    fetch(): Promise<YoutubeTrack>;
    getStreams(): Promise<YoutubeStreams>;
    get url(): string;
}
declare class YoutubeResults extends TrackResults {
    process(body: any): void;
    extract_tracks(list: any): void;
    set_continuation(cont: any): void;
    continuation: any;
    next(): Promise<YoutubeResults | null>;
}
declare class YoutubePlaylist extends TrackPlaylist {
    process(id: any, data: any, offset: any): void;
    id: any;
    next_offset: any;
    next(): Promise<YoutubePlaylist | null>;
    get url(): string;
}
declare class YoutubeMusicResults extends TrackResults {
    process(body: any): void;
    process_section(section: any): void;
    top_result: any;
    songs: any[] | undefined;
    from_section(list: any): any[];
    process_once(body: any): void;
    extract_tracks(list: any): void;
    set_continuation(cont: any): void;
    continuation: any;
    set_browse(query: any, params: any): void;
    browse: any;
    query: any;
    next(): Promise<YoutubeMusicResults | null>;
}
declare class YoutubeStreams extends TrackStreams {
    from(start: any, playerResponse: any): this;
    expire: any;
    extract_streams(streams: any, adaptive: any): void;
}
import { Track } from "../Track";
import { TrackResults } from "../Track";
import { TrackPlaylist } from "../Track";
import { TrackStreams } from "../Track";
