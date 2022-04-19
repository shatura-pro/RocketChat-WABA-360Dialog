import { IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ILivechatRoom } from '@rocket.chat/apps-engine/definition/livechat/ILivechatRoom';
import {
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from '@rocket.chat/apps-engine/definition/metadata/RocketChatAssociations';

import { IPersisFileBuffer } from './interfaces/IPersisFileBuffer';
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
                                        attachID: string = '',
                                        directionIn: boolean = true,
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
            this.persis.updateByAssociations(
                association,
                {
                    lcMessageID,
                    rcMessageID,
                    attachID,
                    directionIn,
                },
                true,

            );
        } catch (err) {
            console.warn(err);
        }
    }

    public async readRoomInfoByWaIDPersis(waID: string):
        Promise<ILivechatRoom | undefined> {
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
        let result: ILivechatRoom | undefined;
        try {
            const records = (await this.read
                .getPersistenceReader()
                .readByAssociations(association)) as Array<IPersisRoomInfo>;
            if (records.length === 0) {
                return undefined;
            }
            result = records[0].roomLiveChat;
            return result;

        } catch (err) {
            console.warn(err);
        }
        return undefined;
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
            this.persis.updateByAssociations(
                association,
                {
                    roomLiveChat: liveChatRoom,
                },
                true,
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

    public async readFileBuffer(roomID: string, userID: string,
                                fileName: string): Promise<Buffer | undefined> {

        const associations = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                'file-buffer',
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.ROOM,
                roomID,
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.USER,
                userID,
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.FILE,
                fileName,
            ),
        ];

        try {
            const records = (await this.read.getPersistenceReader()
                .readByAssociations(associations)) as Array<IPersisFileBuffer>;
            return records[0].data;
        } catch (err) {
            console.warn(err);
        }
        return;
    }

    public async writeFileBuffer(roomID: string, userID: string,
                                 fileName: string, buffer: Buffer) {

        // Add record for roomID
        const associations = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                'file-buffer',
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.ROOM,
                roomID,
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.USER,
                userID,
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.FILE,
                fileName,
            ),
        ];
        try {
            this.persis.updateByAssociations(
                associations,
                {
                    data: buffer,
                },
                true,
            );
        } catch (err) {
            console.warn(err);
        }
    }
}
