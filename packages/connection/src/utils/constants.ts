export const SUB_ACCOUNT_BYTE_LENGTH = 32;
export const CREATE_CANISTER_MEMO = BigInt(0x41455243); // CREA,
export const TOP_UP_CANISTER_MEMO = BigInt(0x50555054); // TPUP

export const TRANSACTION_FEE = BigInt(10_000);

export const LEDGER_CANISTER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
export const NNS_CANISTER_ID = 'qoctq-giaaa-aaaaa-aaaea-cai';



export const PRINCIPAL_REGEX = /(\w{5}-){10}\w{3}/;
export const ALPHANUM_REGEX = /^[a-zA-Z0-9]+$/;
export const CANISTER_REGEX = /(\w{5}-){4}\w{3}/;
export const CANISTER_MAX_LENGTH = 27;

export const ADDRESS_TYPES = {
    PRINCIPAL: 'principal',
    ACCOUNT: 'accountId',
    CANISTER: 'canister',
    ERC20: 'erc20',
    UNKNOWN: 'unknown',
};
