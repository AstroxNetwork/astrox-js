/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-useless-catch */
/* eslint-disable @typescript-eslint/ban-types */
import { DelegationIdentity } from '@dfinity/identity';
import fetch from 'cross-fetch';
// import {
//   GetTransactionsResponse,
//   Send,
//   Timestamp,
// } from 'src/frontend/generated/nns-dapp';
import { NET_ID, ROSETTA_URL } from '../../utils/constants';
import {
  formatAssetBySymbol,
  parseBalance,
  TokenSymbol,
} from '../../utils/converter';
import { TransactionResponse } from '../../connections/ledgerConnection';
import { NNSConnection as nns } from '../../connections/nnsConnection';
import { GetTransactionsResponse, Send, Timestamp } from 'src/canisters/nns-dapp';

export const MILI_PER_SECOND = 1_000_000;

interface Operation {
  account: {
    address: string;
  };
  amount: {
    value: string;
    currency: {
      symbol: string;
      decimals: number;
    };
  };
  status: RosettaTransactionStatus;
  type: RosettaTransactionType;
}

export enum RosettaTransactionStatus {
  COMPLETED = 'COMPLETED',
  REVERTED = 'REVERTED',
  PENDING = 'PENDING',
}

export enum RosettaTransactionType {
  TRANSACTION = 'TRANSACTION',
  FEE = 'FEE',
  RECEIVE = 'RECEIVE',
  SEND = 'SEND',
}

export interface Currency {
  symbol: string;
  decimals: number;
}

interface RosettaTransaction {
  metadata: {
    block_height: number;
    memo: number;
    timestamp: bigint;
    lockTime: number;
  };
  operations: Operation[];
  transaction_identifier: { hash: string };
}

export interface InnerUsedTransactionDetail {
  to?: string;
  from: string;
  status?: RosettaTransactionStatus;
  amount?: string;
  currency?: {
    symbol: string;
    decimals: number;
  };
  fee: {
    amount?: string;
    currency?: {
      symbol: string;
      decimals: number;
    };
  };
}

export interface InnerUsedTransaction {
  type: RosettaTransactionType;
  details: InnerUsedTransactionDetail;
}

export interface InferredTransaction {
  hash: string;
  timestamp: string;
  type: RosettaTransactionType;
  details: InnerUsedTransactionDetail;
  caller: string;
  block_height: string;
  memo: string;
  lockTime: string;
}

export interface GetRossetaTransactionsResponse {
  total: number;
  transactions: InferredTransaction[];
}

const getTransactionInfo = (
  accountId: string,
  rosettaTransaction: RosettaTransaction,
): InferredTransaction => {
  const {
    operations,
    metadata: { timestamp: ts, block_height: bh, memo: mm, lockTime: lt },
    transaction_identifier: { hash },
  } = rosettaTransaction;
  // console.log('------ getting rosetta transaction start  -------');
  // console.log({ rosettaTransaction });
  // console.log('------ getting rosetta transaction end  -------');

  const transaction: InnerUsedTransaction = {
    type: RosettaTransactionType.SEND,
    details: {
      status: RosettaTransactionStatus.COMPLETED,
      fee: {},
      from: accountId,
    },
  };

  operations.forEach((operation) => {
    const value = BigInt(operation.amount.value);
    const { decimals } = operation.amount.currency;
    const amount = parseBalance({ value: value.toString(), decimals });
    if (operation.type === RosettaTransactionType.FEE) {
      transaction.details.fee.amount = amount;
      transaction.details.fee.currency = operation.amount.currency;
      return;
    }

    if (value >= 0) transaction.details.to = operation.account.address;
    if (value <= 0) transaction.details.from = operation.account.address;

    if (
      transaction.details.status === RosettaTransactionStatus.COMPLETED &&
      operation.status !== RosettaTransactionStatus.COMPLETED
    )
      transaction.details.status = operation.status;

    transaction.type =
      transaction.details.to === accountId
        ? RosettaTransactionType.RECEIVE
        : RosettaTransactionType.SEND;
    transaction.details.amount = amount;
    transaction.details.currency = operation.amount.currency;
  });

  return {
    ...transaction,
    caller: transaction.details.from,
    hash,
    timestamp:
      ts !== undefined ? (BigInt(ts) / BigInt(MILI_PER_SECOND)).toString() : '',
    block_height: bh !== undefined ? BigInt(bh).toString() : '',
    memo: mm !== undefined ? BigInt(mm).toString() : '',
    lockTime: lt !== undefined ? BigInt(lt).toString() : '',
  };
};

export const getICPTransactions = async (
  accountId: string,
): Promise<GetRossetaTransactionsResponse> => {
  const response = await fetch(`${ROSETTA_URL}/search/transactions`, {
    method: 'POST',
    body: JSON.stringify({
      network_identifier: NET_ID,
      account_identifier: {
        address: accountId,
      },
    }),
    headers: {
      'Content-Type': 'application/json',
      Accept: '*/*',
    },
  });
  if (!response.ok)
    throw Error(`GET_TRANSACTIONS_FAILS: ${response.statusText}`);
  const { transactions, total_count } = await response.json();
  const transactionsInfo = transactions.map(({ transaction }: { transaction: any }) =>
    getTransactionInfo(accountId, transaction),
  );
  return {
    total: total_count,
    transactions: transactionsInfo,
  };
};

export const getTransactions = async (
  localDelegationIdentity: DelegationIdentity,
  fromAccount: string,
): Promise<GetTransactionsResponse> => {
  const result = await nns.getTransactions(
    { delegationIdentity: localDelegationIdentity },
    { page_size: 10, offset: 0, account_identifier: fromAccount },
  );
  return result;
};

export const getICPTransactionsByBlock = async (
  fromAccount: string,
  blockHeight: bigint,
) => {
  try {
    const response = await fetch(`${ROSETTA_URL}/block`, {
      method: 'POST',
      body: JSON.stringify({
        network_identifier: NET_ID,
        block_identifier: { index: parseInt(blockHeight.toString()) },
      }),
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
      },
    });
    if (!response.ok)
      throw Error(`GET_TRANSACTIONS_FAILS: ${response.statusText}`);
    const { block } = await response.json();
    const { transactions } = block;
    if (transactions === undefined || block === undefined) {
      return {
        total: transactions.length,
        transactions: [],
      };
    }
    const transactionsInfo = transactions.map((transaction: RosettaTransaction) =>
      getTransactionInfo(fromAccount, transaction),
    );
    return {
      total: transactions.length,
      transactions: transactionsInfo,
    };
  } catch (error) {
    throw error;
  }
};

export const getExactTransaction = (
  fromAccount: string,
  singleResponse: TransactionResponse,
  txns: GetTransactionsResponse,
): InferredTransaction | undefined => {
  const { sendArgs } = singleResponse;
  const { amount, created_at_time, memo, to } = sendArgs;
  const { blockHeight } = singleResponse;
  const { transactions } = txns;

  console.log({ singleResponse, txns });

  const found = transactions.find((val) => {
    return created_at_time[0] !== undefined
      ? (val.timestamp as Timestamp).timestamp_nanos >
      (created_at_time[0] as Timestamp).timestamp_nanos
      : true &&
      val.block_height === blockHeight &&
      val.memo === memo &&
      JSON.stringify(val.transaction_type[0]) ===
      JSON.stringify({ Send: null }) &&
      (val.transfer as { Send: Send }).Send.amount.e8s === amount.e8s &&
      (val.transfer as { Send: Send }).Send.to === to;
  });
  if (found) {
    const res = {
      hash: '',
      timestamp: (
        BigInt((found.timestamp as Timestamp).timestamp_nanos) / BigInt(1000000)
      ).toString(),
      type: RosettaTransactionType.SEND,
      details: {
        to,
        from: fromAccount,
        status: RosettaTransactionStatus.COMPLETED,
        amount: amount.e8s.toString(),
        currency: {
          symbol: TokenSymbol.ICP,
          decimals: 10,
        },
        fee: {
          amount: (found.transfer as { Send: Send }).Send.fee.e8s.toString(),
          currency: {
            symbol: TokenSymbol.ICP,
            decimals: 10,
          },
        },
      },
      caller: fromAccount,
      block_height: blockHeight.toString(),
      memo: memo!.toString(),
      lockTime: '',
    };
    return res;
  }

  return undefined;
};

// use Rosseta API to fetch transaction list, and return
// This API works on mainnet, however not in local testnet
export const getTransactionFromRosseta = (
  fromAccount: string,
  singleResponse: TransactionResponse,
  txns: GetRossetaTransactionsResponse,
): InferredTransaction | undefined => {
  const { sendArgs } = singleResponse;
  const { amount, created_at_time, memo, to } = sendArgs;
  const { blockHeight } = singleResponse;
  const { transactions } = txns;

  console.log({ singleResponse, transactions });

  const found = transactions.find((val) => {
    return created_at_time[0] !== undefined
      ? val.timestamp.length <
        (created_at_time[0] as Timestamp).timestamp_nanos.toString().length
        ? BigInt(val.timestamp) * BigInt(1000000) >
        (created_at_time[0] as Timestamp).timestamp_nanos
        : BigInt(val.timestamp) >
        (created_at_time[0] as Timestamp).timestamp_nanos
      : true &&
      BigInt(val.block_height) === blockHeight &&
      BigInt(val.memo) === memo &&
      val.details.to === to &&
      val.details.amount ===
      formatAssetBySymbol(
        amount!.e8s,
        val.details.currency!.symbol,
      )?.amount.toString() &&
      val.caller === fromAccount;
  });
  return found;
};

const aaa = {
  transaction_identifier: {
    hash: 'df8576aa9be05b561dae1b7f706d109789cf25b895d29b3a1d7da2df92247d97',
  },
  operations: [
    {
      type: 'TRANSACTION',
      operation_identifier: { index: 0 },
      status: 'COMPLETED',
      account: {
        address:
          'da5fd722e22c4970b4347d41873ba86c51f87ee32f271d6762fc49627eeecb71',
      },
      amount: { value: -100000, currency: { symbol: 'ICP', decimals: 8 } },
    },
    {
      type: 'TRANSACTION',
      operation_identifier: { index: 1 },
      status: 'COMPLETED',
      account: {
        address:
          '848753b6fac50019dffc34ead1af095863405b3cce463352c1ecf3109ada4b23',
      },
      amount: { value: 100000, currency: { symbol: 'ICP', decimals: 8 } },
    },
    {
      type: 'FEE',
      operation_identifier: { index: 2 },
      status: 'COMPLETED',
      account: {
        address:
          'da5fd722e22c4970b4347d41873ba86c51f87ee32f271d6762fc49627eeecb71',
      },
      amount: { value: -10000, currency: { symbol: 'ICP', decimals: 8 } },
    },
  ],
  metadata: {
    block_height: 1680083,
    memo: 22380256,
    timestamp: 1639810289340003912,
  },
};
