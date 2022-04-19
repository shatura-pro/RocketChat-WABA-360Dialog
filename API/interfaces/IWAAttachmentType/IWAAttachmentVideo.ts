export interface IWAAttachmentVideo {
    recipient_type: 'individual';
    to: string;
    type: 'video';
    video: {
        // media_id here
        id: string,
        caption?: string,
    };
}
