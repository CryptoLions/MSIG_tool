import { JsonRpc } from "eosjs";

export interface Msig {
    userInfo: User;
    config: MsigConf;
    rpc: JsonRpc;
}

export interface User {
    accountName: string;
    permission: string;
}

export interface MsigConf {
    nameOfProposal: string;
    proposerName: string;
    expirationDate: Date;
}

export interface Action {
    account: string;
    name: string;
    authorization: Authorization[];
    data: any;
}

export interface SerializedAction extends Action {
    data: string;
}

export interface Authorization {
    actor: string;
    permission: string;
}
