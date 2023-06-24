export = SourceError;
declare class SourceError extends Error {
    constructor(code: number, message: string, error: Error);
    code: number;
    stack: string | undefined;
    details: string | undefined;
}
declare namespace SourceError {
    let INTERNAL_ERROR: any;
    let NETWORK_ERROR: any;
    let NOT_FOUND: any;
    let INVALID_RESPONSE: any;
    let codes: {};
}
