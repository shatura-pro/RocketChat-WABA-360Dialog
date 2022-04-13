export interface IWAMessageTypeImage {
    context?: {
        from: string,
        id: string,
    };
    from: string;
    id: string;
    image: {
        file: string,
        id: string,
        mime_type: string,
        sha256: string,
        caption?: string,
    };
    timestamp: string;
    type: string;
}
