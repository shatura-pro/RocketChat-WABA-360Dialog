export interface IWAAttachmentDocument {
    recipient_type: 'individual';
    to: string;
    type: 'document';
    document: {
        // media_id here
        id: string,
        caption?: string,
    };
}
