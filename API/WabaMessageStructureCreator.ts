import { IWAMessageTypeDocument } from './interfaces/IWAMessageType/IWAMessageTypeDocument';
import { IWAMessageTypeImage } from './interfaces/IWAMessageType/IWAMessageTypeImage';
import { IWAMessageTypeText } from './interfaces/IWAMessageType/IWAMessageTypeText';
import { IWAMessageTypeVoice } from './interfaces/IWAMessageType/IWAMessageTypeVoice';

export class WabaMessageStructureCreator {
    public text: IWAMessageTypeText;
    public image: IWAMessageTypeImage;
    public document: IWAMessageTypeDocument;
    public voice: IWAMessageTypeVoice;
    constructor(body: any) {
        switch (body.messages[0].type) {
            case 'text':
                this.text = body.messages[0];
                break;
            case 'image':
                this.image = body.messages[0];
                break;
            case 'document':
                this.document = body.messages[0];
                break;
            case 'voice':
                this.voice = body.messages[0];
                break;
        }
    }
}
