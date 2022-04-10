import {
    IAppAccessors,
    IConfigurationExtend,
    IConfigurationModify,
    IEnvironmentRead,
    IHttp,
    ILogger,
    IModify,
    IPersistence,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { ApiSecurity, ApiVisibility } from '@rocket.chat/apps-engine/definition/api/IApi';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { ILivechatRoom } from '@rocket.chat/apps-engine/definition/livechat/ILivechatRoom';
import { IPostLivechatRoomClosed } from '@rocket.chat/apps-engine/definition/livechat/IPostLivechatRoomClosed';
import { IMessage } from '@rocket.chat/apps-engine/definition/messages/IMessage';
import { IPostMessageSent } from '@rocket.chat/apps-engine/definition/messages/IPostMessageSent';
import {
    IAppInfo,
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from '@rocket.chat/apps-engine/definition/metadata';
import { ISetting, SettingType } from '@rocket.chat/apps-engine/definition/settings';

import { Webhook } from './endpoints/webhook';
import { SDK } from './lib/sdk';
import { WAPPTmplsCommands } from './slashcommans/wapptmplscommands';

export class Waba360DialogApp
    extends App
    implements IPostMessageSent, IPostLivechatRoomClosed {
    public D360APIKEY: string;
    public TemplatesLanguageCode: string;
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async onEnable(
        environment: IEnvironmentRead,
        configurationModify: IConfigurationModify,
    ): Promise<boolean> {
        this.D360APIKEY = await environment
            .getSettings()
            .getValueById('D360-API-KEY');

        this.TemplatesLanguageCode = await environment
            .getSettings()
            .getValueById('Templates-Language-Code');

        return true;
    }

    public async onSettingUpdated(
        setting: ISetting,
        configurationModify: IConfigurationModify,
        read: IRead,
        http: IHttp,
    ): Promise<void> {
        switch (setting.id) {
            case 'Templates-Language-Code':
                this.TemplatesLanguageCode = setting.value;
                break;
            case 'D360-API-KEY':
                this.D360APIKEY = setting.value;
                const serverURL = await read
                    .getEnvironmentReader()
                    .getServerSettings()
                    .getValueById('Site_Url');
                const updateWebhook = new SDK(this, http);
                await updateWebhook.setwebhook(serverURL, this.getID());
                break;
        }
    }

    public async executePostMessageSent(
        message: IMessage,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify,
    ): Promise<void> {

        const association = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                'active-room',
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.ROOM,
                message.room.id,
            ),
        ];
        let result: Array<any> | undefined = [];
        try {
            const records: Array<{
                roomLiveChat: string;
            }> = (await read
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
        if (result.length !== 0 && message.sender.type === 'user') {
            const forwardMessage = new SDK(this, http);
            forwardMessage.sendMessage(
                result[0].roomLiveChat.visitor.username,
                message.text);
        }
    }

    public async executePostLivechatRoomClosed(
        room: ILivechatRoom,
        read: IRead,
        http: IHttp,
        persis: IPersistence,
        modify?: IModify,
    ): Promise<void> {

        // Delete information about active Visitor room
        const association1 = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                'active-room',
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                room.visitor.username,
            ),
        ];
        const association2 = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                'active-room',
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.ROOM,
                room.id,
            ),
        ];

        persis.removeByAssociations(association1);
        persis.removeByAssociations(association2);
    }

    protected async extendConfiguration(
        configuration: IConfigurationExtend,
        environmentRead: IEnvironmentRead,
    ): Promise<void> {
        // Register API endpoint Webhook
        configuration.api.provideApi({
            visibility: ApiVisibility.PUBLIC,
            security: ApiSecurity.UNSECURE,
            endpoints: [new Webhook(this)],
        });
        // Add slash command /wapptmpls
        const wappCommand: WAPPTmplsCommands = new WAPPTmplsCommands(this);
        await configuration.slashCommands.provideSlashCommand(wappCommand);
        // Add 360Dialog API KEY setting
        await configuration.settings.provideSetting({
            id: 'D360-API-KEY',
            packageValue: 'API KEY HERE',
            type: SettingType.STRING,
            required: true,
            public: false,
            i18nLabel: 'D360-API-KEY-setting-label',
            i18nDescription: 'D360-API-KEY-setting-description',
        });
        // Add Template language code
        await configuration.settings.provideSetting({
            id: 'Templates-Language-Code',
            packageValue: 'ru',
            type: SettingType.STRING,
            required: true,
            public: false,
            i18nLabel: 'languageCode-setting-label',
            i18nDescription: 'languageCode-setting-description',
        });
    }

}
