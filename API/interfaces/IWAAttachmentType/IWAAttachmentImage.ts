export interface IWAAttachmentImage {
    recipient_type: 'individual';
    to: string;
    type: 'image';
    image: {
        // media_id here
        id: string,
        caption?: string,
    };
}
