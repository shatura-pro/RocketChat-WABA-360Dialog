import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { SDK } from '../lib/sdk';
import { Waba360DialogApp } from '../Waba360DialogApp';

export class WAPPTmplsCommands implements ISlashCommand {
    public command = 'wapptmpls';
    public i18nParamsExample = '';
    public i18nDescription = 'wapptmpls_description';
    public providesPreview = false;
    public permission?: 'livechat-agent';

    public constructor(private readonly app: Waba360DialogApp) {
    }

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ): Promise<void> {
        const requestTemplates = new SDK(
            this.app,
            http,
        );
        const templates = await requestTemplates.reuqestTemplates();
        const TmplsList: Array<any> = [];
        templates.waba_templates.forEach((item: any) => {
            // tslint:disable-next-line:max-line-length
            if (
                item.status === 'approved' &&
                item.language === this.app.TemplatesLanguageCode &&
                (item.name.match(new RegExp('sample', 'g')) || []).length === 0
            ) {
                const newitem = this.searchVariables(item);
                TmplsList.push(newitem);
            }
        });
        console.log(TmplsList);
        // const block = modify.getCreator().getBlockBuilder();
    }

    private searchVariables(TmplsListItem: any) {
        let agrsCount: number = 0;
        TmplsListItem.components.forEach((item: any) => {
            switch (item.type) {
                case 'BODY':
                    agrsCount += (item.text.match(/{{\d}}/g) || []).length;
                case 'FOOTER':
                    agrsCount += (item.text.match(/{{\d}}/g) || []).length;
            }
        });
        TmplsListItem.agrsCount = agrsCount;
        return TmplsListItem;
    }
}
