export interface IWAMessagesResponse {
    contacts: [
        input: string,
        wa_id: string,
    ];
    messages: [
        { id: string},
    ];
    meta: [
        api_status: string,
        version: string,
    ];
}
