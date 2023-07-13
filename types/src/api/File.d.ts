declare const _exports: File;
export = _exports;
export { FileTrack as Track };
declare class File {
    Track: typeof FileTrack;
    get(url: string): Promise<never>;
    get_streams(url: string): Promise<never>;
    playlist(url: string, length?: number | undefined): Promise<never>;
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
import { Track } from "../Track";
