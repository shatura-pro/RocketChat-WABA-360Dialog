import { IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ILivechatRoom } from '@rocket.chat/apps-engine/definition/livechat/ILivechatRoom';
import {
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from '@rocket.chat/apps-engine/definition/metadata/RocketChatAssociations';

import { IPersisLastMessage } from './interfaces/IPersisLastMessage';
import { IPersisMessageInfo } from './interfaces/IPersisMessageInfo';
import { IPersisRoomInfo } from './interfaces/IPersisRoomInfo';

export class PersisUsage {
    public read: IRead;
    public persis: IPersistence;
    constructor(read: IRead, persis: IPersistence) {
        this.read = read;
        this.persis = persis;
}

    public async readMessageInfoRoomIDPersis(roomID: string):
        Promise<Array<IPersisMessageInfo>> {
        const associations = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                'wa-message',
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.ROOM,
                roomID,
            ),
        ];
        let result: Array<IPersisMessageInfo> = [];
        try {
            const records = (await this.read.getPersistenceReader()
                .readByAssociations(associations)) as Array<IPersisMessageInfo>;
            result = Array.from(records);
        } catch (err) {
            console.warn(err);
        }

        return result;
    }

    public async writeMessageInfoPersis(roomID: string,
                                        lcMessageID: string,
                                        rcMessageID: string,
                                        directionIn: boolean = true,
                                        attachID: string = '',
    ) {

        const association = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                'wa-message',
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.ROOM,
                roomID,
            ),
            // WABA Message ID
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.LIVECHAT_MESSAGE,
                lcMessageID,
            ),
            // RocketChat Message ID
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MESSAGE,
                rcMessageID,
            ),
        ];
        try {
            this.persis.createWithAssociations(
                {
                    lcMessageID,
                    rcMessageID,
                    attachID,
                    directionIn,
                },
                association,
            );
        } catch (err) {
            console.warn(err);
        }
    }

    public async readRoomInfoByWaIDPersis(
        waID: string): Promise<Array<IPersisRoomInfo>> {
        const association = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                'wa-active-room',
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                waID,
            ),
        ];
        let result: Array<IPersisRoomInfo> = [];
        try {
            const records = (await this.read
                .getPersistenceReader()
                .readByAssociations(association)) as Array<IPersisRoomInfo>;
            result = Array.from(records);
        } catch (err) {
            console.warn(err);
        }
        return result;
    }

    public async readRoomInfoByRoomIDPersis(
        roomID: string): Promise<Array<IPersisRoomInfo>> {
        const association = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                'wa-active-room',
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.ROOM,
                roomID,
            ),
        ];
        let result: Array<IPersisRoomInfo> = [];
        try {
            const records = (await this.read
                .getPersistenceReader()
                .readByAssociations(association)) as Array<IPersisRoomInfo>;
            result = Array.from(records);
        } catch (err) {
            console.warn(err);
        }
        return result;
    }

    public async writeRoomInfoPersis(
        liveChatRoom: ILivechatRoom,
    ) {
        // Add record for roomID
        const association = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                'wa-active-room',
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.ROOM,
                liveChatRoom.id,
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                liveChatRoom.visitor.username),
        ];
        try {
            this.persis.createWithAssociations(
                {
                    roomLiveChat: liveChatRoom,
                },
                association,
            );
        } catch (err) {
            console.warn(err);
        }
    }

    public async readLastMessage(roomID: string):
        Promise<IPersisLastMessage> {
        const associations = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                'wa-last-message',
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.ROOM,
                roomID,
            ),
        ];
        const result: Array<IPersisLastMessage> = [];
        try {
            const records = (await this.read.getPersistenceReader()
                .readByAssociations(associations)) as Array<IPersisLastMessage>;
            for (const element of records) {
                    result.push(element);
                }
        } catch (err) {
            console.warn(err);
        }
        return result[0];
    }

   public async writeLastMessage(roomID: string, lcMessageID: string):
        Promise<void> {
        const associations = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                'wa-last-message',
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.ROOM,
                roomID,
            ),
        ];

        const data: IPersisLastMessage = {
           lcMessageID,
        };

        try {
            this.persis.updateByAssociations(
                associations,
                data,
                true,
            );
        } catch (err) {
            console.warn(err);
        }
    }
}
