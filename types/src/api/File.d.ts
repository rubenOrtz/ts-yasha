declare class FileTrack extends Track {
    constructor(url: string, isfile?: boolean);
    private stream_url;
    isLocalFile: boolean;
    id: string;
    getStreams(): Promise<never>;
    fetch(): Promise<never>;
    get url(): string;
}
import { Track } from "../Track";
export declare function create(url: string, isfile: boolean): Track;
export { FileTrack as Track };
