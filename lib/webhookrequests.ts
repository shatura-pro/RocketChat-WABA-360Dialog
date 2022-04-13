import { IHttp } from '@rocket.chat/apps-engine/definition/accessors';
import { IModify } from '@rocket.chat/apps-engine/definition/accessors/IModify';
import { IPersistence } from '@rocket.chat/apps-engine/definition/accessors/IPersistence';
import { IRead } from '@rocket.chat/apps-engine/definition/accessors/IRead';
import { IApiRequest } from '@rocket.chat/apps-engine/definition/api/IRequest';
import { IVisitor } from '@rocket.chat/apps-engine/definition/livechat';
import { ILivechatRoom } from '@rocket.chat/apps-engine/definition/livechat/ILivechatRoom';
import { IMessageAttachment } from '@rocket.chat/apps-engine/definition/messages/IMessageAttachment';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUploadDescriptor } from '@rocket.chat/apps-engine/definition/uploads/IUploadDescriptor';

import { API } from '../API/api';
import { WabaMessageStructureCreator } from '../API/WabaMessageStructureCreator';
import { IPersisRoomInfo } from '../persistence/interfaces/IPersisRoomInfo';
import { PersisUsage } from '../persistence/persisusage';
import { uuid } from './uuid';

export class Webhookrequests {
    private bodyRequest: any;
    private request: IApiRequest;
    private read: IRead;
    private modify: IModify;
    private http: IHttp;
    private persis: IPersistence;
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

        if (this.request.headers['content-type'] === 'application/json') {
            this.bodyRequest = this.request.content;
        }
    }

    public async receiveMessage() {
        // console.log(`BODY REQUEST: ${JSON.stringify(this.bodyRequest)}`);
        const bodyTypeMessage = this.bodyRequest.messages[0].type;

        const wabaContact = this.bodyRequest.contacts[0];
        let wabaMessageID: string = '';
        let wabaText: string | undefined;

        const persis = new PersisUsage(this.read, this.persis);
        const wabaMessageType = new WabaMessageStructureCreator(this.bodyRequest);
        const api = new API(this.read, this.http);

        let rcMessageID: string = '';
        const roomInfo: Array<IPersisRoomInfo> = await persis.readRoomInfoByWaIDPersis(
            wabaContact.wa_id,
        );
        let lcRoom: ILivechatRoom;

        //
        switch (bodyTypeMessage) {
            case 'image':
                wabaMessageID = wabaMessageType.image.id;
                wabaText = (wabaMessageType.image.image.caption) ? wabaMessageType.image.image.caption : '';
                if (roomInfo.length === 0) {
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
                            phone: [{ phoneNumber: wabaMessageType.image.from }],
                            token: visitorToken,
                        };
                        // Create Visitor in system
                        livechatCreator.createVisitor(visitor);
                    }
                    const roomCreator = await this.read
                        .getUserReader()
                        .getByUsername('');
                    lcRoom = await livechatCreator.createRoom(
                        visitor,
                        roomCreator,
                    );

                    const attachResponse = await api.requestFile(
                        wabaMessageType.image.image.id);
                    const fileBuffer = Buffer.from(attachResponse.content);
                    const filenameBeforeRegex = attachResponse.headers['content-disposition'];
                    const filename = filenameBeforeRegex.match('attachment; filename=(.*)');
                    if (!filename) {
                        return;
                    }
                    console.log(`FILENAME: ${filename}`);
                    const uploadDescriptor: IUploadDescriptor = {
                        filename: filename[1],
                        room: lcRoom,
                        visitorToken: lcRoom.visitor.token,
                    };
                    const attachBuffer = await this.modify.getCreator()
                        .getUploadCreator()
                        .uploadBuffer(fileBuffer, uploadDescriptor);
                    const attach: IMessageAttachment = {
                        imageUrl: attachBuffer.url,
                        collapsed: true,
                    };
                    persis.writeRoomInfoPersis(lcRoom);
                    rcMessageID = await this.sendMessageToRoomWithAttach(lcRoom,
                        lcRoom.visitor,
                        attach,
                        wabaText,
                    );
                    break;

                } else {
                    const [obj] = roomInfo;
                    lcRoom = obj.roomLiveChat; // Export LivechatRoom info from Persis
                    const attachResponse = await api.requestFile(
                        wabaMessageType.image.image.id);
                    const fileBuffer = Buffer.from(attachResponse.content);
                    const filenameBeforeRegex = attachResponse.headers['content-disposition'];
                    const filename = filenameBeforeRegex.match('attachment; filename=(.*)');
                    if (!filename) {
                        return;
                    }
                    const uploadDescriptor: IUploadDescriptor = {
                        filename: filename[1],
                        room: lcRoom,
                        visitorToken: lcRoom.visitor.token,
                    };
                    const attachBuffer = await this.modify.getCreator()
                        .getUploadCreator()
                        .uploadBuffer(fileBuffer, uploadDescriptor);
                    console.log(`ATTACH BUFER: ${JSON.stringify(attachBuffer)}`);
                    const attach: IMessageAttachment = {
                        imageUrl: attachBuffer.url,
                        collapsed: true,
                    };

                    rcMessageID = await this.sendMessageToRoomWithAttach(lcRoom,
                        lcRoom.visitor,
                        attach,
                        wabaText);
                }
                // Add Message info record to persis
                persis.writeMessageInfoPersis(lcRoom.id,
                    wabaMessageID,
                    rcMessageID,
                );

                // Update last message info
                persis.writeLastMessage(lcRoom.id, wabaMessageID);
                return;

            case 'text':
                wabaMessageID = wabaMessageType.text.id;
                wabaText = wabaMessageType.text.text.body;
                // Check new room persis record for waID
                if (roomInfo.length === 0) {
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
                            phone: [{ phoneNumber: wabaMessageType.text.from }],
                            token: visitorToken,
                        };
                        // Create Visitor in system
                        livechatCreator.createVisitor(visitor);
                    }
                    const roomCreator = await this.read
                        .getUserReader()
                        .getByUsername('');
                    lcRoom = await livechatCreator.createRoom(
                        visitor,
                        roomCreator,
                    );

                    persis.writeRoomInfoPersis(lcRoom);
                    rcMessageID = await this.sendMessageToRoom(lcRoom,
                        lcRoom.visitor,
                        wabaText);

                } else {
                    const [obj] = roomInfo;
                    lcRoom = obj.roomLiveChat; // Export LivechatRoom info from Persis
                    rcMessageID = await this.sendMessageToRoom(lcRoom,
                        lcRoom.visitor,
                        wabaText);
                }
                // Add Message info record to persis
                persis.writeMessageInfoPersis(lcRoom.id,
                    wabaMessageID,
                    rcMessageID,
                );

                // Update last message info
                persis.writeLastMessage(lcRoom.id, wabaMessageID);
                return;
        }

    }

    private async createMainRoomStructure(wabaContact, wabaMessageType) {
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
                phone: [{ phoneNumber: wabaMessageType.text.from }],
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
        );
        return lcRoom;

    }
    private async sendMessageToRoom(room: IRoom | ILivechatRoom,
                                    visitor: IVisitor,
                                    text: string): Promise<string> {
        const messageStructure = this.modify
            .getCreator()
            .startLivechatMessage()
            .setText(text)
            .setParseUrls(true)
            .setRoom(room)
            .setVisitor(visitor);

        return await this.modify.getCreator().finish(messageStructure);
    }

    private async sendMessageToRoomWithAttach(room: IRoom | ILivechatRoom,
                                              visitor: IVisitor,
                                              attach: IMessageAttachment,
                                              text: string): Promise<string> {
        const messageStructure = this.modify
            .getCreator()
            .startLivechatMessage()
            .addAttachment(attach)
            .setText(text)
            .setParseUrls(true)
            .setRoom(room)
            .setVisitor(visitor);

        return await this.modify.getCreator().finish(messageStructure);
    }

}
