export interface IWAMessageImage {
    context?: {
        from: string,
        id: string,
    };
    from: string;
    id: string;
    timestamp: string;
    type: string;
    image: {
        file: string,
        id: string,
        mime_type: string,
        sha256: string,
        caption?: string,
    };
}
