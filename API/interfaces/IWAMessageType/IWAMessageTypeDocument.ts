export interface IWAMessageTypeDocument {
     context?: {
        from: string,
        id: string,
    };
    from: string;
    id: string;
    timestamp: string;
    type: string;
    document: {
        caption?: string,
        file: string,
        id: string,
        mime_type: string,
        sha256: string,
    };
}
