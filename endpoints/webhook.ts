import { HttpStatusCode, IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ApiEndpoint, IApiEndpointInfo, IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';
import { Webhookrequests } from '../lib/webhookrequests';

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

            const newRequest = new Webhookrequests(
                request,
                read,
                modify,
                persis,
            );
            newRequest.sendMessage();
            return this.success();
    }
}
