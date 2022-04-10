import { IModify } from '@rocket.chat/apps-engine/definition/accessors/IModify';
import { IPersistence } from '@rocket.chat/apps-engine/definition/accessors/IPersistence';
import { IRead } from '@rocket.chat/apps-engine/definition/accessors/IRead';
import { IApiRequest } from '@rocket.chat/apps-engine/definition/api/IRequest';
import { ILivechatRoom } from '@rocket.chat/apps-engine/definition/livechat/ILivechatRoom';
import { IVisitor } from '@rocket.chat/apps-engine/definition/livechat/IVisitor';
import {
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from '@rocket.chat/apps-engine/definition/metadata/RocketChatAssociations';

import { uuid } from './uuid';

export class Webhookrequests {
    private bodyRequest: any;
    private request: IApiRequest;
    private read: IRead;
    private modify: IModify;
    private persis: IPersistence;
    constructor(
        request: IApiRequest,
        read: IRead,
        modify: IModify,
        persis: IPersistence,
    ) {
        this.request = request;
        this.read = read;
        this.modify = modify;
        this.persis = persis;

        if (this.request.headers['content-type'] === 'application/json') {
            this.bodyRequest = this.request.content;
        }
    }

    public async sendMessage() {
        const WABAcontact = this.bodyRequest.contacts[0];
        const WABAmessage = this.bodyRequest.messages[0];

        // Check new room persis record
        const resultCheckPersis = await this.readPersisRecord(
            WABAcontact.wa_id,
        );
        if (resultCheckPersis.length === 0) {
            const livechatCreator = this.modify
                .getCreator()
                .getLivechatCreator();
            const visitor = await this.read
                .getLivechatReader()
                .getLivechatVisitorByPhoneNumber(WABAcontact.wa_id);
            let visitorObj: IVisitor;

            // Check visitor available
            if (!visitor) {
                const wabaVisitorToken = livechatCreator.createToken();
                visitorObj = {
                    id: uuid(),
                    name: WABAcontact.profile.name,
                    username: WABAcontact.wa_id,
                    phone: [{ phoneNumber: WABAmessage.from }],
                    token: wabaVisitorToken,
                };

                livechatCreator.createVisitor(visitorObj);
            } else {
                visitorObj = visitor;
            }
            const roomCreator = await this.read
                .getUserReader()
                .getByUsername(WABAcontact.wa_id);
            const liveChatRoom = await livechatCreator.createRoom(
                visitorObj,
                roomCreator,
            );
            this.writePersisRecords(liveChatRoom);
            const messageStructure = this.modify
                .getCreator()
                .startLivechatMessage()
                .setText(WABAmessage.text.body)
                .setParseUrls(true)
                .setRoom(liveChatRoom)
                .setVisitor(liveChatRoom.visitor);

            await this.modify.getCreator().finish(messageStructure);
        } else {
            const [obj] = resultCheckPersis;
            const { roomLiveChat } = obj;
            const messageStructure = this.modify
                .getCreator()
                .startLivechatMessage()
                .setText(WABAmessage.text.body)
                .setParseUrls(true)
                .setRoom(roomLiveChat)
                .setVisitor(roomLiveChat.visitor);

            await this.modify
                    .getCreator()
                    .finish(messageStructure);
        }
    }

    private async readPersisRecord(waID: string) {
        const association = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                'active-room',
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                waID,
            ),
        ];
        let result: Array<any> | undefined = [];
        try {
            const records: Array<{
                roomLiveChat: string;
            }> = (await this.read
                .getPersistenceReader()
                .readByAssociations(association)) as Array<{
                roomLiveChat: string;
            }>;
            if (records.length) {
                result = Array.from(records);
            }
        } catch (err) {
            console.warn(err);
        }
        return result;
    }

    private async writePersisRecords(
        liveChatRoom: ILivechatRoom,
    ) {
        // Add record for roomID
        const association1 = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                'active-room',
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.ROOM,
                liveChatRoom.id,
            ),
        ];
        try {
            this.persis.createWithAssociations(
                {
                    roomLiveChat: liveChatRoom,
                },
                association1,
            );
        } catch (err) {
            console.warn(err);
        }

        // Add record for waID
        const association2 = [
        new RocketChatAssociationRecord(
            RocketChatAssociationModel.MISC,
            'active-room',
        ),
        new RocketChatAssociationRecord(
            RocketChatAssociationModel.MISC,
            liveChatRoom.visitor.username,
        ),
        ];
        try {
            this.persis.createWithAssociations(
            {
                roomLiveChat: liveChatRoom,
            },
            association2,
            );
        } catch (err) {
            console.warn(err);
        }

    }
}
