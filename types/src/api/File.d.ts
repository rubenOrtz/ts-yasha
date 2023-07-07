declare const _exports: File;
export = _exports;
export { FileTrack as Track };
declare class File {
    Track: typeof FileTrack;
    create(url: string, isfile: boolean): FileTrack;
}
declare class FileTrack extends Track<"File"> {
    constructor(url: string, isfile?: boolean);
    private stream_url;
    isLocalFile: boolean;
    id: string;
    getStreams(): Promise<never>;
    fetch(): Promise<never>;
    get url(): string;
}
import { Track } from "../Track";
