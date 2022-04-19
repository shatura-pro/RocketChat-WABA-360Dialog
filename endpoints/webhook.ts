import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ApiEndpoint, IApiEndpointInfo, IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';

import { WabaRequest } from '../lib/WabaRequest';

export class Webhook extends ApiEndpoint {
    public path = 'webhook';

    public async post(
        request: IApiRequest,
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ): Promise<IApiResponse> {

        const newRequest = new WabaRequest(
                this.app,
                request,
                read,
                modify,
                http,
                persis,
        );

        newRequest.receiveMessage();
        return this.success();
    }
}
