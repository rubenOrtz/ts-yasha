declare const _exports: File;
export = _exports;
export { FileTrack as Track };
declare class File {
    Track: typeof FileTrack;
    get(url: string): Promise<FileTrack | null>;
    get_streams(url: string): Promise<FileStream | null>;
    playlist(url: string, length?: number | undefined): Promise<FilePlaylist>;
    create(url: string, isfile?: boolean | undefined): FileTrack;
}
declare class FileTrack extends Track<"File"> {
    constructor(url: string, isfile?: boolean | undefined);
    private stream_url;
    isLocalFile: boolean;
    id: string;
    getStreams(): Promise<never>;
    fetch(): Promise<never>;
    get url(): string;
}
declare class FileStream extends TrackStream {
    constructor(url: string, isfile: boolean);
    private is_file;
    equals(other: FileStream): boolean;
}
declare class FilePlaylist extends TrackPlaylist {
    from(url: string, isfile?: boolean | undefined): this;
}
import { Track } from "../Track";
import { TrackStream } from "../Track";
import { TrackPlaylist } from "../Track";
