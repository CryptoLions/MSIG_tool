import { Api, JsonRpc } from 'eosjs';
import { Action, Authorization, Msig as IMsig, MsigConf, SerializedAction, User } from './types';

export class Msig {
    msig: IMsig;

    constructor(user: User, config: MsigConf, rpc: JsonRpc) {
        this.msig = {
            userInfo: user,
            config,
            rpc,
        };
    }

    #buildMsigProposeData (msigConf: MsigConf, requested: Authorization[], serializedActions: SerializedAction[]) {
        return {
            proposer: msigConf.proposerName,
            proposal_name: msigConf.nameOfProposal,
            requested,
            trx: {
                expiration: msigConf.expirationDate.toISOString().split('.')[0],
                ref_block_num: 0,
                ref_block_prefix: 0,
                max_net_usage_words: 0,
                max_cpu_usage_ms: 0,
                delay_sec: 0,
                context_free_actions: [],
                actions: serializedActions,
                transaction_extensions: [],
            },
        }
    };

    async #getAllAccountsRecursive (rpc: JsonRpc, accountName: string, permission = 'active'): Promise<any> {
        let waxAcc: any;

        try {
            waxAcc = await rpc.get_account(accountName);
        } catch (error) {
            throw new Error(`Error on get_account with name ${accountName}`);
        }
    
        if (!waxAcc) {
            throw new Error(`No account with name ${accountName}`);
        }
    
        const { permissions } = waxAcc;
    
        const permissionByName = permissions.find((permItem: any) => permItem.perm_name === permission);
        if (!permissionByName) {
            throw new Error(`No account with permission ${permission}`);
        }
    
        const { accounts } = permissionByName.required_auth;
    
        if (accounts.length === 0) {
            return { actor: waxAcc.account_name, permission };
        }
    
        const result = await Promise.all(accounts.map(async (account: any) => {
            if (account.permission.actor === accountName) {
                return { actor: account.permission.actor, permission };
            }
    
            return this.#getAllAccountsRecursive(rpc, account.permission.actor, permission);
        },
        ));
    
        return result.flat();
    };

    async #getAccountsFromAuthList (rpc: JsonRpc, authList: Authorization[]) {
        const results = await Promise.all(authList.map(data => (
            this.#getAllAccountsRecursive(rpc, data.actor, data.permission)
        )));
        return results.flat(1);
    };

    async #fetchRequestedApprovals(actionsList: Action[]) {
        let list = [];

        try {
            const results = await Promise.all((actionsList)
                .map(async (action) => (this.#getAccountsFromAuthList(this.msig.rpc, action.authorization))));

            const flatList = results.flat(1)
            const uniqueValues = flatList.reduce((arr: [], value: Authorization) => {
                const existingValue = arr.find((item: Authorization) => item.actor === value.actor);
                return existingValue ? arr : [...arr, value];
            }, []);
            list = uniqueValues;
        } catch (error: any) {
            throw new Error('Error while serializing actions :>> ' + error);
        }

        return list
    }

    #generateMsigActions (actor: string, permission: string, proposeInput: any) {
        return {
            actions: [{
                account: 'eosio.msig',
                name: 'propose',
                authorization: [{
                    actor,
                    permission,
                }],
                data: proposeInput,
            }],
        }
    };

    async generateMsig(actions: Action[]) {
        // @ts-ignore
        const api = new Api({ rpc: this.msig.rpc });
        let serializedActions;

        try {
            serializedActions = await api.serializeActions(actions);
        } catch (error: any) {
            throw new Error('Error while serializing actions :>> ' + error);
        }

        const requestedApprovals = await this.#fetchRequestedApprovals(actions);
        const msigPropose = this.#buildMsigProposeData(this.msig.config, requestedApprovals, serializedActions);
        return this.#generateMsigActions(this.msig.userInfo.accountName, this.msig.userInfo.permission, msigPropose);
    }
}
