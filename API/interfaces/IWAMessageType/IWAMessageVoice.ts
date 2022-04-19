export interface IWAMessageVoice {
    context?: {
        from: string,
        id: string,
    };
    from: string;
    id: string;
    timestamp: string;
    type: string;
    voice: {
        file: string,
        id: string,
        mime_type: string,
        sha256: string,
    };
}
