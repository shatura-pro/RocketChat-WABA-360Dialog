export interface IWAFileResponse {
    url: string;
    method: string;
    statusCode: number;
    headers: {
        [key: string]: string;
    };
    content: Buffer;
}
