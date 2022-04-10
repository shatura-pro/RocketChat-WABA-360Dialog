import { IHttp, IHttpRequest } from '@rocket.chat/apps-engine/definition/accessors';

import { Waba360DialogApp } from '../Waba360DialogApp';

export class SDK {
    constructor(
        private App: Waba360DialogApp,
        private readonly http: IHttp,
        private basePath = 'https://waba.360dialog.io',
    ) {}

    public async setwebhook(serverURL: string, appID: string): Promise<any> {
        const url: string = `${this.basePath}/v1/configs/webhook`;
        const webhookUrl = `${serverURL}/api/apps/public/${appID}/webhook`;
        const webhookContent = {
            url: webhookUrl,
        };
        const httpRequest: IHttpRequest = {
            content: JSON.stringify(webhookContent),
            headers: {
                'D360-API-KEY': this.App.D360APIKEY,
                'Content-Type': 'application/json',
            },
        };
        const result = await this.post(url, httpRequest);
        return result;
    }

    public async reuqestTemplates(): Promise<any> {
        const packetContent: object = {
            headers: {
                'D360-API-KEY': this.App.D360APIKEY,
                'User-Agent': 'Rocket.Chat-Apps-Engine',
            },
        };

        return await this.get(
            'https://waba.360dialog.io/v1/configs/templates',
            packetContent,
        );
    }

    public async sendMessage(waID: string, text?: string) {
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
                'D360-API-KEY': this.App.D360APIKEY,
                'Content-Type': 'application/json',
            },
        };

        await this.post(url, httpRequest);
    }

    public async sendMessageToNumber(projecId: string, data: JSON) {
        const packetContent: object = {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Rocket.Chat-Apps-Engine',
            },
            data,
        };
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
