export interface IWAMessageText {
    context?: {
        from: string,
        id: string,
    };
    from: string;
    id: string;
    timestamp: string;
    text: {
        body: string,
        id?: string,
    };
    type: string;
}
