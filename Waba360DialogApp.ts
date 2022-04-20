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
import { ISetting, ISettingSelectValue, SettingType } from '@rocket.chat/apps-engine/definition/settings';
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

    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async onEnable(
        environment: IEnvironmentRead,
        configurationModify: IConfigurationModify,
    ): Promise<boolean> {
        // Update webhook
        const serverURL = await this.getAccessors()
            .environmentReader
            .getServerSettings()
            .getValueById('Site_Url');
        const updateWebhook = new API(this.getAccessors().reader, this.getAccessors().http);
        const result = await updateWebhook.setwebhook(serverURL, this.getID());

        console.log(`WEBHOOK UPDATE: ${JSON.stringify(result)}`);

        return true;
    }

    public async onSettingUpdated(
        setting: ISetting,
        configurationModify: IConfigurationModify,
        read: IRead,
        http: IHttp,
    ): Promise<void> {
        switch (setting.id) {
            case 'D360-API-KEY':
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

        this.sendFinishMessage(room.visitor.username);

        this.deleteRoomAllMedia(room);

        this.deleteRoomAllPersisInfo(room, persis);

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
            type: SettingType.STRING,
            required: true,
            public: false,
            i18nLabel: 'd360-api-key-setting-label',
            i18nDescription: 'd360-api-key-setting-description',
            i18nPlaceholder: 'd360-api-key-placeholder',
            packageValue: undefined,
        });

        // Add Agent`s signature setting
        const selectValues: Array<ISettingSelectValue> = [
            {
                key: 'none',
                i18nLabel: 'none-label',
            },
            {
                key: 'agent-name',
                i18nLabel: 'agent-name',
            },
            {
                key: 'agent-login',
                i18nLabel: 'agent-login',
            },
        ];

        await configuration.settings.provideSetting({
            id: 'Agent-Signature',
            type: SettingType.SELECT,
            value: 'agent-name',
            values: selectValues,
            required: false,
            public: false,
            i18nLabel: 'agent-signature-setting-label',
            i18nDescription: 'agent-signature-setting-description',
            packageValue: undefined,
        });

        // Add Department setting
        await configuration.settings.provideSetting({
            id: 'Department',
            type: SettingType.STRING,
            required: false,
            public: false,
            i18nLabel: 'department-setting-label',
            i18nDescription: 'department-setting-description',
            i18nPlaceholder: 'department-placeholder',
            packageValue: undefined,
        });

        // Add Welcome message setting
        await configuration.settings.provideSetting({
            id: 'Welcome-Message',
            type: SettingType.CODE,
            required: false,
            public: false,
            i18nLabel: 'welcome-message-setting-label',
            i18nDescription: 'welcome-message-setting-description',
            i18nPlaceholder: 'welcome-message-placeholder',
            packageValue: undefined,
        });

        // Add Finish message setting
        await configuration.settings.provideSetting({
            id: 'Finish-Message',
            type: SettingType.CODE,
            required: false,
            public: false,
            i18nLabel: 'finish-message-setting-label',
            i18nDescription: 'finish-message-setting-description',
            i18nPlaceholder: 'finish-message-placeholder',
            packageValue: undefined,
        });

        // // Add Template language code
        // await configuration.settings.provideSetting({
        //     id: 'Templates-Language-Code',
        //     packageValue: 'ru',
        //     type: SettingType.STRING,
        //     required: true,
        //     public: false,
        //     i18nLabel: 'languageCode-setting-label',
        //     i18nDescription: 'languageCode-setting-description',
        // });
    }

    private async deleteRoomAllPersisInfo(room: ILivechatRoom, persis: IPersistence) {
        // Delete information about active Visitor room
        const association = [
            new RocketChatAssociationRecord(
                RocketChatAssociationModel.ROOM,
                room.id,
            ),
        ];

        persis.removeByAssociations(association);
    }

    private async deleteRoomAllMedia(room: ILivechatRoom) {
        const api = new API(this.getAccessors().reader, this.getAccessors().http);
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

        const allMessages = (await this.getAccessors().reader.getPersistenceReader()
            .readByAssociations(associations)) as unknown as Array<IPersisMessageInfo>;

        for (const el of allMessages) {
            if (el.attachID !== '') {
                api.deleteMedia(el.attachID);
            }
        }
    }

    private async sendFinishMessage(waID: string) {

        const finishMessage = await this.getAccessors().environmentReader
            .getSettings().getValueById('Finish-Message');

        if (finishMessage && finishMessage !== '') {
            const api = new API(this.getAccessors().reader,
                this.getAccessors().http);
            api.sendMessage(waID, finishMessage);
        }

    }

}
