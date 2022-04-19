import { IHttp, IHttpRequest, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAttachment } from '@rocket.chat/apps-engine/definition/messages/IMessageAttachment';
import { contentType } from 'mime-types';

import { IWAAttachmentDocument } from './interfaces/IWAAttachmentType/IWAAttachmentDocument';
import { IWAAttachmentImage } from './interfaces/IWAAttachmentType/IWAAttachmentImage';
import { IWAAttachmentVideo } from './interfaces/IWAAttachmentType/IWAAttachmentVideo';
import { IWAAttachmentVoice } from './interfaces/IWAAttachmentType/IWAAttachmentVoice';
import { IWAFileResponse } from './interfaces/IWAFileResponse';
import { IWAMediaResponse } from './interfaces/IWAMediaResponse';
import { IWAMessagesResponse } from './interfaces/IWAMessagesResponse';

export class API {
    constructor(
        private read: IRead,
        private readonly http: IHttp,
        private basePath = 'https://waba.360dialog.io',
    ) {}

    public async setwebhook(serverURL: string, appID: string): Promise<any> {
        const APIKEY = await this.getAPIKey();

        const url: string = `${this.basePath}/v1/configs/webhook`;
        const webhookUrl = `${serverURL}/api/apps/public/${appID}/webhook`;
        const webhookContent = {
            url: webhookUrl,
        };
        const httpRequest: IHttpRequest = {
            content: JSON.stringify(webhookContent),
            headers: {
                'D360-API-KEY': APIKEY,
                'Content-Type': 'application/json',
            },
        };
        const result = await this.post(url, httpRequest);
        return result;
    }

    public async requestTemplates(): Promise<any> {
        const APIKEY = await this.getAPIKey();

        const packetContent: object = {
            headers: {
                'D360-API-KEY': APIKEY,
                'User-Agent': 'Rocket.Chat-Apps-Engine',
            },
        };

        return await this.get(
            'https://waba.360dialog.io/v1/configs/templates',
            packetContent,
        );
    }

    public async sendMessage(waID: string, text?: string): Promise<string> {
        const APIKEY = await this.getAPIKey();

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
                'D360-API-KEY': APIKEY,
                'Content-Type': 'application/json',
            },
        };

        const response = (await this.post(url, httpRequest)) as IWAMessagesResponse;

        return response.messages[0].id;

    }

    public async sendMessageWithAttachment(waID: string,
                                           attachID: string,
                                           messageAttachment: IMessageAttachment):
        Promise<string> {

        const APIKEY = await this.getAPIKey();

        const url = `${this.basePath}/v1/messages`;

        const contentObject = this.contentStructure(waID,
            attachID,
            messageAttachment);

        const httpRequest: IHttpRequest = {
            content: JSON.stringify(contentObject),
            headers: {
                'D360-API-KEY': APIKEY,
                'Content-Type': 'application/json',
            },
        };

        const response = (await this.post(url, httpRequest)) as IWAMessagesResponse;

        return response.messages[0].id;

    }

    public async markMessageRead(lcMessageID: string):
        Promise<void> {
        const APIKEY = await this.getAPIKey();

        const url = `${this.basePath}/v1/messages`;
        const httpRequest: IHttpRequest = {
            content: JSON.stringify({
                status: 'read',
            }),
            headers: {
                'D360-API-KEY': APIKEY,
                'Content-Type': 'application/json',
            },
        };

        setTimeout(() => {
            const newUrl = url + '/' + lcMessageID;
            this.http.put(newUrl, httpRequest);
        }, 2000);
    }

    public async postMedia(data: Buffer, filename: string): Promise<string> {
        const APIKEY = await this.getAPIKey();

        const url = `${this.basePath}/v1/media`;
        const httpRequest = {
            content: data,
            headers: {
                'D360-API-KEY': APIKEY,
                'Content-Type': contentType(filename),
            },
        };

        const response = await this.post(url, httpRequest);

        const result = response as IWAMediaResponse;

        return result.media[0].id;
    }

    public async deleteMedia(attachID: string):
        Promise<void> {
        const APIKEY = await this.getAPIKey();

        const url = `${this.basePath}/v1/messages`;
        const httpRequest: IHttpRequest = {
            content: JSON.stringify({
                status: 'read',
            }),
            headers: {
                'D360-API-KEY': APIKEY,
            },
        };

        setTimeout(() => {
            const newUrl = url + '/' + attachID;
            this.http.del(newUrl, httpRequest);
        }, 2000);
    }

     public async requestMedia(attachID: string): Promise<IWAFileResponse> {
        const APIKEY = await this.getAPIKey();

        const url = `${this.basePath}/v1/media`;
        const httpRequest: IHttpRequest = {
            headers: {
                'D360-API-KEY': APIKEY,
            },
            encoding: null,
        };
        const newUrl = url + '/' + attachID;
        const result = (await this.http.get(newUrl, httpRequest)) as unknown as IWAFileResponse;
        return result;
     }

    private contentStructure(waID: string, attachID: string,
                             messageAttachment: IMessageAttachment) {

        let contentStructure: IWAAttachmentImage | IWAAttachmentVoice |
            IWAAttachmentVideo | IWAAttachmentDocument;

        if (messageAttachment.imageUrl) {
            contentStructure = {
                recipient_type: 'individual',
                to: waID,
                type: 'image',
                image: {
                    id: attachID,
                    caption: messageAttachment.description,
                },
            };
        } else if (messageAttachment.audioUrl) {
            contentStructure = {
                recipient_type: 'individual',
                to: waID,
                type: 'audio',
                audio: {
                    id: attachID,
                },
            };
        } else if (messageAttachment.videoUrl) {
            contentStructure = {
                recipient_type: 'individual',
                to: waID,
                type: 'video',
                video: {
                    id: attachID,
                    caption: messageAttachment.description,
                },
            };
        } else {
            contentStructure = {
                recipient_type: 'individual',
                to: waID,
                type: 'document',
                document: {
                    id: attachID,
                    caption: (messageAttachment.title) ?
                        messageAttachment.title.value :
                        '',
                },
            };
        }

        return contentStructure;
    }

    private async getAPIKey() {
        return await this.read.getEnvironmentReader()
                        .getSettings()
                        .getValueById('D360-API-KEY');
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
