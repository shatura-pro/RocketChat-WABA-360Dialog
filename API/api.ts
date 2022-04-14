import { IHttp, IHttpRequest, IRead } from '@rocket.chat/apps-engine/definition/accessors';

import { IPersisLastMessage } from '../persistence/interfaces/IPersisLastMessage';
import { IWAFileResponse } from './interfaces/IWAFileResponse';
import { IWAMessagesResponse } from './interfaces/IWAMessagesResponse';

export class API {
    private APIKEY: any;
    constructor(
        private read: IRead,
        private readonly http: IHttp,
        private basePath = 'https://waba.360dialog.io',
    ) {
        this.APIKEY = read.getEnvironmentReader()
            .getSettings()
            .getValueById('D360-API-KEY');
    }

    public async setwebhook(serverURL: string, appID: string): Promise<any> {
        this.APIKEY = await this.read.getEnvironmentReader()
            .getSettings()
            .getValueById('D360-API-KEY');
        const url: string = `${this.basePath}/v1/configs/webhook`;
        const webhookUrl = `${serverURL}/api/apps/public/${appID}/webhook`;
        const webhookContent = {
            url: webhookUrl,
        };
        const httpRequest: IHttpRequest = {
            content: JSON.stringify(webhookContent),
            headers: {
                'D360-API-KEY': this.APIKEY,
                'Content-Type': 'application/json',
            },
        };
        const result = await this.post(url, httpRequest);
        return result;
    }

    public async requestTemplates(): Promise<any> {
        this.APIKEY = await this.read.getEnvironmentReader()
            .getSettings()
            .getValueById('D360-API-KEY');
        const packetContent: object = {
            headers: {
                'D360-API-KEY': this.APIKEY,
                'User-Agent': 'Rocket.Chat-Apps-Engine',
            },
        };

        return await this.get(
            'https://waba.360dialog.io/v1/configs/templates',
            packetContent,
        );
    }

    public async sendMessage(waID: string, text?: string): Promise<IWAMessagesResponse> {
        this.APIKEY = await this.read.getEnvironmentReader()
            .getSettings()
            .getValueById('D360-API-KEY');
        const url = `${this.basePath}/v1/messages`;
        const httpRequest: IHttpRequest = {
            content: JSON.stringify({
                recipient_type: 'individual',
                to: waID,
                type: 'text',
                text: {
                    body: (text) ? text : '',
                },
            }),
            headers: {
                'D360-API-KEY': this.APIKEY,
                'Content-Type': 'application/json',
            },
        };

        const response = (await this.post(url, httpRequest)) as IWAMessagesResponse;

        return response;

    }

    public async requestFile(attachID: string): Promise<IWAFileResponse> {
        this.APIKEY = await this.read.getEnvironmentReader()
            .getSettings()
            .getValueById('D360-API-KEY');
        const url = `${this.basePath}/v1/media`;
        const httpRequest: IHttpRequest = {
            headers: {
                'D360-API-KEY': this.APIKEY,
            },
            encoding: null,
        };
        const newUrl = url + '/' + attachID;
        const result = (await this.http.get(newUrl, httpRequest)) as unknown as IWAFileResponse;
        return result;
    }

    public async markMessageRead(message: IPersisLastMessage):
        Promise<void> {
        this.APIKEY = await this.read.getEnvironmentReader()
            .getSettings()
            .getValueById('D360-API-KEY');

        const url = `${this.basePath}/v1/messages`;
        const httpRequest: IHttpRequest = {
            content: JSON.stringify({
                status: 'read',
            }),
            headers: {
                'D360-API-KEY': this.APIKEY,
                'Content-Type': 'application/json',
            },
        };

        setTimeout(() => {
            const newUrl = url + '/' + message.lcMessageID;
            this.http.put(newUrl, httpRequest);
        }, 2000);
    }

    public async deleteAttach(attachID: string):
        Promise<void> {
        this.APIKEY = await this.read.getEnvironmentReader()
            .getSettings()
            .getValueById('D360-API-KEY');

        const url = `${this.basePath}/v1/messages`;
        const httpRequest: IHttpRequest = {
            content: JSON.stringify({
                status: 'read',
            }),
            headers: {
                'D360-API-KEY': this.APIKEY,
            },
        };

        setTimeout(() => {
            const newUrl = url + '/' + attachID;
            this.http.del(newUrl, httpRequest);
        }, 2000);
    }

    private async post(url: string, packageContent: object): Promise<object> {
        const response = await this.http.post(url, packageContent);
        // If it isn't a 2xx code, something wrong happened
        if (!response.statusCode.toString().startsWith('2')) {
            throw response;
        }

        return JSON.parse(response.content || '{}');
    }

    private async get(url: string, packageContent: object): Promise<object> {
        const response = await this.http.get(url, packageContent);

        // If it isn't a 2xx code, something wrong happened
        if (!response.statusCode.toString().startsWith('2')) {
            throw response;
        }
        return JSON.parse(response.content || '{}');
    }
}
