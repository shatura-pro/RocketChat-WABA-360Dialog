import { IExtraRoomParams, IHttp, ILivechatMessageBuilder } from '@rocket.chat/apps-engine/definition/accessors';
import { IModify } from '@rocket.chat/apps-engine/definition/accessors/IModify';
import { IPersistence } from '@rocket.chat/apps-engine/definition/accessors/IPersistence';
import { IRead } from '@rocket.chat/apps-engine/definition/accessors/IRead';
import { IApiRequest } from '@rocket.chat/apps-engine/definition/api/IRequest';
import { ILivechatTransferData, IVisitor } from '@rocket.chat/apps-engine/definition/livechat';
import { ILivechatRoom } from '@rocket.chat/apps-engine/definition/livechat/ILivechatRoom';
import { IMessageAttachment } from '@rocket.chat/apps-engine/definition/messages/IMessageAttachment';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms/IRoom';
import { IUploadDescriptor } from '@rocket.chat/apps-engine/definition/uploads/IUploadDescriptor';
import { extension } from 'mime-types';

import { API } from '../API/api';
import { IWAMessageContact } from '../API/interfaces/IWAMessageType/IWAMessageContact';
import { IWAMessageDocument } from '../API/interfaces/IWAMessageType/IWAMessageDocument';
import { IWAMessageImage } from '../API/interfaces/IWAMessageType/IWAMessageImage';
import { IWAMessageText } from '../API/interfaces/IWAMessageType/IWAMessageText';
import { IWAMessageVideo } from '../API/interfaces/IWAMessageType/IWAMessageVideo';
import { IWAMessageVoice } from '../API/interfaces/IWAMessageType/IWAMessageVoice';
import { PersisUsage } from '../persistence/persisusage';
import { uuid } from './uuid';

export class WabaRequest {
    private bodyRequest: any;
    private request: IApiRequest;
    private read: IRead;
    private modify: IModify;
    private http: IHttp;
    private persis: IPersistence;
    private appSource: IExtraRoomParams;
    constructor(
        request: IApiRequest,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ) {
        this.request = request;
        this.read = read;
        this.modify = modify;
        this.http = http;
        this.persis = persis;
        this.appSource = {
            source: {
                type: 'app',
                id: uuid(),
                alias: 'WhatsApp 360Dialog',
                label: 'integration',
                sidebarIcon: 'whatsappBusiness',
                defaultIcon: 'whatsappBusiness',
            },
        };

        if (this.request.headers['content-type'] === 'application/json') {
            this.bodyRequest = this.request.content;
        }
    }

    public async receiveMessage() {

        // console.log(`BODY REQUEST: ${JSON.stringify(this.bodyRequest)}`);
        const persis = new PersisUsage(this.read, this.persis);
        const api = new API(this.read, this.http);

        const wabaMessageType: string = this.bodyRequest.messages[0].type;
        const wabaContact = (this.bodyRequest.contacts[0]) as IWAMessageContact;
        const wabaMessage = await this.createWabaMEssageStructure(wabaMessageType);
        if (!wabaMessage) { return; }
        const wabaMessageID: string = wabaMessage.id;
        const wabaAttachID: string = wabaMessage[wabaMessageType].id;
        const wabaText: string | undefined = (wabaMessageType === 'text') ?
            wabaMessage[wabaMessageType].body :
            wabaMessage[wabaMessageType].caption;

        let rcMessageID: string = '';
        let attach: IMessageAttachment | undefined;
        const roomInfoSearch = await persis.readRoomInfoByWaIDPersis(
            wabaContact.wa_id,
        );
        let lcRoom: ILivechatRoom;

        // Check new room persis record for waID
        if (!roomInfoSearch) {
            lcRoom = await this.createMainRoomStructure(wabaContact,
                wabaMessage,
                persis);

            if (wabaMessageType !== 'text') {
                attach = await this.createAttachStructure(
                    wabaMessage,
                    lcRoom,
                );
            }

            this.sendWelcomeMessage(wabaContact.wa_id);

            rcMessageID = await this.sendMessageToRoom(lcRoom,
                lcRoom.visitor,
                wabaText,
                attach,
            );
        } else {
            lcRoom = roomInfoSearch;

            if (wabaMessageType !== 'text') {
                attach = await this.createAttachStructure(
                    wabaMessage,
                    lcRoom,
                );
            }

            rcMessageID = await this.sendMessageToRoom(lcRoom,
                lcRoom.visitor,
                wabaText,
                attach);
        }

        if ((await this.read.getRoomReader().getMembers(lcRoom.id)).length !== 0) {
            api.markMessageRead(wabaMessageID);
        }

        // Add Message info record to persis
        persis.writeMessageInfoPersis(lcRoom.id,
            wabaMessageID,
            rcMessageID,
            wabaAttachID,
            true,
        );

        // Update last message info
        persis.writeLastMessage(lcRoom.id, wabaMessageID);
    }

    private async createMainRoomStructure(wabaContact: IWAMessageContact,
                                          wabaMessage: any,
                                          persis: PersisUsage) {
        const departmentAppVar = await this.read.getEnvironmentReader()
            .getSettings().getValueById('Department');
        const department = await this.read.getLivechatReader()
            .getLivechatDepartmentByIdOrName(departmentAppVar);

        const messageType: string = this.bodyRequest.messages[0].type;
        const livechatCreator = this.modify
            .getCreator()
            .getLivechatCreator();
        let visitor = await this.read
            .getLivechatReader()
            .getLivechatVisitorByPhoneNumber(wabaContact.wa_id);
        // Check visitor available
        if (!visitor) {
            const visitorToken = livechatCreator.createToken();
            visitor = {
                id: uuid(),
                name: wabaContact.profile.name,
                username: wabaContact.wa_id,
                phone: [{ phoneNumber: wabaMessage[messageType].from }],
                token: visitorToken,
            };
            // Create Visitor in system
            livechatCreator.createVisitor(visitor);
                    }
        const roomCreator = await this.read
                        .getUserReader()
                        .getByUsername('');
        const lcRoom = await livechatCreator.createRoom(
            visitor,
            roomCreator,
            this.appSource,
        );

        if (department) {
            const transferData: ILivechatTransferData = {
                currentRoom: lcRoom,
                targetDepartment: department.id,
            };
            this.modify.getUpdater().getLivechatUpdater()
                .transferVisitor(visitor, transferData);
        }
        persis.writeRoomInfoPersis(lcRoom);

        return lcRoom;

    }

    private async createAttachStructure(wabaMessage: any,
                                        lcRoom: ILivechatRoom,
    ): Promise <IMessageAttachment | undefined> {

        const wabaMessageType: string = this.bodyRequest.messages[0].type;

        const api = new API(this.read, this.http);

        const attachResponse = await api.requestMedia(
            wabaMessage[wabaMessageType].id);
        const filenameBeforeRegex = attachResponse.headers['content-disposition'];
        const filenameAfterRegex = filenameBeforeRegex.match('attachment; filename=(.*)');
        if (!filenameAfterRegex) {
            return;
        }
        const filename = filenameAfterRegex[1] + '.' +
            extension(wabaMessage[wabaMessageType].mime_type);

        const uploadDescriptor: IUploadDescriptor = {
            filename: (wabaMessageType === 'document') ?
                wabaMessage[wabaMessageType].filename : filename,
            room: lcRoom,
            visitorToken: lcRoom.visitor.token,
        };

        const attachBuffer = await this.modify.getCreator()
            .getUploadCreator()
            .uploadBuffer(attachResponse.content, uploadDescriptor);

        let attach: IMessageAttachment;

        if (wabaMessageType === 'image') {
            attach = {
                imageUrl: attachBuffer.url,
                collapsed: true,
                text: (wabaMessage[wabaMessageType].caption) ?
                    wabaMessage[wabaMessageType].caption : '',
            };
            return attach;
        }

        if (wabaMessageType === 'document') {
            attach = {
                imageUrl: attachBuffer.url,
                collapsed: true,
            };
            return attach;
        }

        if (wabaMessageType === 'voice') {
            attach = {
                audioUrl: attachBuffer.url,
                collapsed: true,
            };
            return attach;
        }

        if (wabaMessageType === 'video') {
            attach = {
                videoUrl: attachBuffer.url,
                collapsed: true,
                text: (wabaMessage[wabaMessageType].caption) ?
                    wabaMessage[wabaMessageType].caption : '',
            };
            return attach;
        }

        return undefined;
    }

    private async createWabaMEssageStructure(wabaMessageType: string):
        Promise<IWAMessageVoice |
            IWAMessageImage |
            IWAMessageDocument |
            IWAMessageText |
            IWAMessageVideo |
            undefined> {
        const wabaMesssage = this.bodyRequest.messages[0];
        if (wabaMessageType === 'text') {
            return wabaMesssage as IWAMessageText;
        }

        if (wabaMessageType === 'document') {
            return wabaMesssage as IWAMessageDocument;
        }

        if (wabaMessageType === 'image') {
            return wabaMesssage as IWAMessageImage;
        }

        if (wabaMessageType === 'voice') {
            return wabaMesssage as IWAMessageVoice;
        }

        if (wabaMessageType === 'video') {
            return wabaMesssage as IWAMessageVideo;
        }
        return;
    }

    private async sendMessageToRoom(room: IRoom | ILivechatRoom,
                                    visitor: IVisitor,
                                    text?: string,
                                    attach?: IMessageAttachment | undefined,
                                    ): Promise <string> {
        let messageStructure: ILivechatMessageBuilder;
        const textMessage = (text) ? text : '';

        if (attach) {
        messageStructure = this.modify
            .getCreator()
            .startLivechatMessage()
            .addAttachment(attach)
            .setText(textMessage)
            .setParseUrls(true)
            .setGroupable(true)
            .setRoom(room)
            .setVisitor(visitor);
        } else {
        messageStructure = this.modify
            .getCreator()
            .startLivechatMessage()
            .setText(textMessage)
            .setParseUrls(true)
            .setGroupable(true)
            .setRoom(room)
            .setVisitor(visitor);
        }
        return await this.modify.getCreator().finish(messageStructure);
    }

    private async sendWelcomeMessage(waID: string) {
        const welcomeMessage = await this.read.getEnvironmentReader()
            .getSettings().getValueById('Welcome-Message');
        const api = new API(this.read, this.http);

        if (welcomeMessage && welcomeMessage !== '') {
            api.sendMessage(waID, welcomeMessage);
        }

    }
}
