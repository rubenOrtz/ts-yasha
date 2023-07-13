declare const _exports: {
    getResponse(url: string, options?: nfetch.RequestInit | undefined): Promise<{
        res: import('node-fetch').Response;
    }>;
    get(url: string, options?: nfetch.RequestInit | undefined): Promise<{
        res: import('node-fetch').Response;
        body: string;
    }>;
    getJSON(url: string, options?: nfetch.RequestInit | undefined): Promise<{
        res: import('node-fetch').Response;
        body: {
            [key: string]: string;
        };
    }>;
    getBuffer(url: string, options?: nfetch.RequestInit | undefined): Promise<{
        res: import('node-fetch').Response;
        body: Buffer;
    }>;
};
export = _exports;
import nfetch = require("node-fetch");
