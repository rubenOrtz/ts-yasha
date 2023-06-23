export = SourceError;
declare class SourceError extends Error {
    constructor(code: any, message: any, error: any);
    code: any;
    stack: any;
    details: any;
}
declare namespace SourceError {
    let codes: {};
}
