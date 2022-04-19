export interface IWAAttachmentVoice {
    recipient_type: 'individual';
    to: string;
    type: 'audio';
    audio: {
        id: string,
    };
}
