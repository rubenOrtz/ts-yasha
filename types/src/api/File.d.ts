declare class FileTrack extends Track {
    constructor(url: any, isfile?: boolean);
    stream_url: any;
    isLocalFile: boolean;
    getStreams(): Promise<void>;
    fetch(): Promise<void>;
    get url(): any;
}
import { Track } from "../Track";
export declare function create(url: any, isfile: any): Track;
export { FileTrack as Track };
