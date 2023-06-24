export = SourceError;
declare class SourceError extends Error {
    /**
     *
     * @param {number} code
     * @param {string} message
     * @param {Error} error
     */
    constructor(code: number, message: string, error: Error);
    code: number;
    stack: string | undefined;
    details: string | undefined;
}
declare namespace SourceError {
    let codes: {};
}
