declare class FileTrack extends Track {
    /**
     *
     * @param {string} url
     * @param {boolean} isfile
     */
    constructor(url: string, isfile?: boolean);
    stream_url: string;
    id: string;
    isLocalFile: boolean;
    getStreams(): Promise<void>;
    fetch(): Promise<void>;
    /**
     * @returns {string}
     */
    get url(): string;
}
import { Track } from "../Track";
/**
 *
 * @param {string} url
 * @param {boolean} isfile
 * @returns {FileTrack}
 */
export declare function create(url: string, isfile: boolean): Track;
export { FileTrack as Track };
