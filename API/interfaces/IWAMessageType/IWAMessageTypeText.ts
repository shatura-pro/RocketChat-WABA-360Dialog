export interface IWAMessageTypeText {
    context?: {
        from: string,
        id: string,
    };
    from: string;
    id: string;
    timestamp: string;
    text: {
      body: string,
    };
    type: string;
}
