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
import { ILivechatEventContext } from '@rocket.chat/apps-engine/definition/livechat/ILivechatEventContext';
import { ILivechatRoom } from '@rocket.chat/apps-engine/definition/livechat/ILivechatRoom';
import { IPostLivechatAgentAssigned } from '@rocket.chat/apps-engine/definition/livechat/IPostLivechatAgentAssigned';
import { IPostLivechatRoomClosed } from '@rocket.chat/apps-engine/definition/livechat/IPostLivechatRoomClosed';
import { IMessage } from '@rocket.chat/apps-engine/definition/messages/IMessage';
import { IPostMessageSent } from '@rocket.chat/apps-engine/definition/messages/IPostMessageSent';
import {
    IAppInfo,
    RocketChatAssociationModel,
    RocketChatAssociationRecord,
} from '@rocket.chat/apps-engine/definition/metadata';
import { ISetting, SettingType } from '@rocket.chat/apps-engine/definition/settings';
import { IFileUploadContext } from '@rocket.chat/apps-engine/definition/uploads/IFileUploadContext';
import { IPreFileUpload } from '@rocket.chat/apps-engine/definition/uploads/IPreFileUpload';

import { API } from './API/api';
import { GetSidebarIcon } from './endpoints/get-sidebar-icon';
import { Webhook } from './endpoints/webhook';
import { AgentRequests } from './lib/AgentRequest';
import { IPersisMessageInfo } from './persistence/interfaces/IPersisMessageInfo';
import { PersisUsage } from './persistence/persisusage';
import { WAPPTmplsCommands } from './slashcommans/wapptmplscommands';

export class Waba360DialogApp
    extends App
    implements IPostMessageSent, IPostLivechatRoomClosed,
    IPostLivechatAgentAssigned, IPreFileUpload {
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
                const updateWebhook = new API(read, http);
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

        const agentRequest = new AgentRequests(message, read, modify, http, persistence);
        agentRequest.sendMessage();

    }

    public async executePostLivechatRoomClosed(
        room: ILivechatRoom,
        read: IRead,
        http: IHttp,
        persis: IPersistence,
        modify?: IModify,
    ): Promise<void> {

        const api = new API(read, http);
        // Delete all files on 360Dialog
        const associations = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.ROOM,
                room.id,
            ),
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.MISC,
                'wa-message',
            ),
        ];

        const allMessages = (await read.getPersistenceReader()
            .readByAssociations(associations)) as unknown as Array<IPersisMessageInfo>;

        for (const el of allMessages) {
            if (el.attachID !== '') {
                api.deleteMedia(el.attachID);
            }
        }

        // Delete information about active Visitor room
        const association = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.ROOM,
                room.id,
            ),
        ];

        persis.removeByAssociations(association);
    }

    public async executePreFileUpload(context: IFileUploadContext,
                                      read: IRead,
                                      http: IHttp,
                                      persis: IPersistence,
                                      modify: IModify): Promise<void> {

        // const persistent = new PersisUsage(read, persis);
        // await persistent.writeFileBuffer(context.file.rid, context.file.userId,
        //     context.file.name, context.content);

    }

    public async executePostLivechatAgentAssigned(context: ILivechatEventContext,
                                                  read: IRead,
                                                  http: IHttp,
                                                  persis: IPersistence,
                                                  modify: IModify): Promise<void> {
        const persistent = new PersisUsage(read, persis);
        const api = new API(read, http);

        const lastMessage = await persistent.readLastMessage(context.room.id);
        api.markMessageRead(lastMessage.lcMessageID);
    }

    protected async extendConfiguration(
        configuration: IConfigurationExtend,
        environmentRead: IEnvironmentRead,
    ): Promise<void> {

        // Register API endpoint get-sidebar-icon
        configuration.api.provideApi({
            visibility: ApiVisibility.PUBLIC,
            security: ApiSecurity.UNSECURE,
            endpoints: [new GetSidebarIcon(this)],
        });

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

        // Add Depatment setting
        await configuration.settings.provideSetting({
            id: 'DEPARTMENTID',
            packageValue: 'Write department id or name here.',
            type: SettingType.STRING,
            required: false,
            public: false,
            i18nLabel: 'DEPARTMENTID-setting-label',
            i18nDescription: 'DEPARTMENTID-setting-description',
        });

        // Add Welcome message setting
        await configuration.settings.provideSetting({
            id: 'WELCOME-MESSAGE',
            packageValue: 'Write welcome message here.',
            type: SettingType.STRING,
            required: false,
            public: false,
            i18nLabel: 'WELCOME-MESSAGE-setting-label',
            i18nDescription: 'WELCOME-MESSAGE-setting-description',
        });

        // Add Finish message setting
        await configuration.settings.provideSetting({
            id: 'FINISH-MESSAGE',
            packageValue: 'Write conversation finish message here.',
            type: SettingType.STRING,
            required: false,
            public: false,
            i18nLabel: 'FINISH-MESSAGE-setting-label',
            i18nDescription: 'FINISH-MESSAGE-setting-description',
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
