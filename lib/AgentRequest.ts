import { IHttp } from '@rocket.chat/apps-engine/definition/accessors/IHttp';
import { IModify } from '@rocket.chat/apps-engine/definition/accessors/IModify';
import { IPersistence } from '@rocket.chat/apps-engine/definition/accessors/IPersistence';
import { IRead } from '@rocket.chat/apps-engine/definition/accessors/IRead';
import { ILivechatRoom, isLivechatRoom } from '@rocket.chat/apps-engine/definition/livechat/ILivechatRoom';
import { IMessage } from '@rocket.chat/apps-engine/definition/messages';
import { IUser } from '@rocket.chat/apps-engine/definition/users/IUser';
import { contentType } from 'mime-types';

import { API } from '../API/api';
import { PersisUsage } from '../persistence/persisusage';

export class AgentRequests {
    private message: IMessage;
    private read: IRead;
    private modify: IModify;
    private http: IHttp;
    private persis: IPersistence;
    constructor(message: IMessage, read: IRead, modify: IModify,
                http: IHttp, persis: IPersistence) {

        this.message = message;
        this.read = read;
        this.modify = modify;
        this.http = http;
        this.persis = persis;
    }

    public async sendMessage() {
        const persis = new PersisUsage(this.read, this.persis);
        const api = new API(this.read, this.http);
        let lcMessageID: string = '';
        let attachID: string = '';
        let textMessage = this.message.text;
        if (this.message.text) {
            textMessage = await this.signWithAgentSignature(this.message.sender,
                this.message.text);
        }

        // Upload file to media volume 360Dialog
        if (this.message.file?._id) {
            const fileBuffer = await this.read.getUploadReader()
                .getBufferById(this.message.file?._id);

            const detectedFileType = contentType(this.message.file.name);
            const fileType = this.message.file.type;
            attachID = await api.postMedia(fileBuffer,
                (detectedFileType) ? detectedFileType : fileType);
        }

        if (isLivechatRoom(this.message.room)) {
            const lcRoom = this.message.room as ILivechatRoom;
            if (this.message.id  && (this.message.sender.type === 'user' ||
                this.message.sender.type === 'bot')) {

                if (attachID !== '' && this.message.attachments) {
                    lcMessageID = await api.sendMessageWithAttachment(
                        lcRoom.visitor.username,
                        attachID,
                        this.message.attachments[0]);
                } else {

                    lcMessageID = await api.sendMessage(
                        lcRoom.visitor.username,
                        textMessage);
                }

                persis.writeMessageInfoPersis(lcRoom.id,
                    lcMessageID,
                    this.message.id,
                    attachID,
                    false);
            }
        }
    }

    private async signWithAgentSignature(sender: IUser, text: string) {

        const signatureType = await this.read.getEnvironmentReader()
            .getSettings().getValueById('Agent-Signature');

        if (signatureType === 'agent-name') {
            return `[${sender.name}] - ${text}`;
        }

        if (signatureType === 'agent-login') {
            return `[${sender.username}] - ${text}`;
        }

        return text;
    }
}
