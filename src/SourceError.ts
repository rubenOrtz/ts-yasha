export const SourceErrorName: { [key: number]: string | undefined } = {
    1: 'Network error',
    2: 'Invalid response',
    3: 'Internal error',
    4: 'Not found',
    5: 'Unplayable',
    6: 'Not a track'
}

export enum SourceErrorCode {
    NETWORK_ERROR = 1,
    INVALID_RESPONSE = 2,
    INTERNAL_ERROR = 3,
    NOT_FOUND = 4,
    UNPLAYABLE = 5,
    NOT_A_TRACK = 6,
}

class SourceError extends Error {
    code: number
    details?: string

    static NETWORK_ERROR = (error?: Error): SourceError => new SourceError(SourceErrorCode.NETWORK_ERROR, SourceErrorName[SourceErrorCode.NETWORK_ERROR], error)
    static INVALID_RESPONSE = (error?: Error): SourceError => new SourceError(SourceErrorCode.INVALID_RESPONSE, SourceErrorName[SourceErrorCode.INVALID_RESPONSE], error)
    static INTERNAL_ERROR = (error?: Error): SourceError => new SourceError(SourceErrorCode.INTERNAL_ERROR, SourceErrorName[SourceErrorCode.INTERNAL_ERROR], error)
    static NOT_FOUND = (error?: Error): SourceError => new SourceError(SourceErrorCode.NOT_FOUND, SourceErrorName[SourceErrorCode.NOT_FOUND], error)
    static UNPLAYABLE = (error?: Error): SourceError => new SourceError(SourceErrorCode.UNPLAYABLE, SourceErrorName[SourceErrorCode.UNPLAYABLE], error)
    static NOT_A_TRACK = (error?: Error): SourceError => new SourceError(SourceErrorCode.NOT_A_TRACK, SourceErrorName[SourceErrorCode.NOT_A_TRACK], error)

    constructor (code: SourceErrorCode, message?: string, error?: Error) {
        super(message ?? SourceErrorName[code])

        this.code = code

        if (error != null) {
            this.stack = error.stack
            this.details = error.message
        }
    }
}

export default SourceError
