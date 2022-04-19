export interface IWAMessageVideo {
    from: string;
    id: string;
    type: string;
    video: {
        caption: string,
        id: string,
        mime_type: string,
        sha256: string,
    };
}
