import { BaseConnection, executeWithLogging, _createActor } from './baseConnection';
import ledger_idl from '../canisters/ledger.idl';
import LEDGER_SERVICE, {
  AccountIdentifier,
  BlockHeight,
  Memo,
  SendArgs,
  SubAccount,
  TimeStamp,
} from '../canisters/ledger';
import { ActorSubclass, HttpAgent, SignIdentity } from '@dfinity/agent';
import { DelegationIdentity } from '@dfinity/identity';
import { fromSubAccountId } from '../utils/converter';
import { LEDGER_CANISTER_ID } from '../utils/constants';
import { CreateActorResult, SendOpts } from '../types';

// export const canisterIdPrincipal: Principal = Principal.fromText(LEDGER_CANISTER_ID);
export interface TransactionResponse {
  blockHeight: bigint;
  sendArgs: SendArgs;
}


export class LedgerConnection extends BaseConnection<LEDGER_SERVICE> {
  protected constructor(
    public identity: SignIdentity,
    public delegationIdentity: DelegationIdentity,
    public actor?: ActorSubclass<LEDGER_SERVICE>,
    public agent?: HttpAgent,
    legerCanisterId?: string,
  ) {
    super(
      identity,
      delegationIdentity,
      legerCanisterId ?? LEDGER_CANISTER_ID,
      ledger_idl,
      actor,
      agent,
    );
  }

  /**
   * create connection
   * @param identity
   * @param delegationIdentity
   * @param legerCanisterId
   * @param actor
   * @param agent
   * @function createConnection
   * @returns {LedgerConnection}
   */
  static createConnection(
    identity: SignIdentity,
    delegationIdentity: DelegationIdentity,
    legerCanisterId?: string,
    actor?: ActorSubclass<LEDGER_SERVICE>,
    agent?: HttpAgent,
  ): LedgerConnection {
    return new LedgerConnection(
      identity,
      delegationIdentity,
      actor,
      agent,
      legerCanisterId ?? LEDGER_CANISTER_ID,
    );
  }

  /**
   * create Actor with DelegationIdentity
   * @param delegationIdentity
   * @param canisterId
   * @param ledgerCanisterId
   * @function {function name}
   * @returns {type} {description}
   */
  static async createActor(
    delegationIdentity: DelegationIdentity,
    ledgerCanisterId?: string,
    host?: string,
  ): Promise<CreateActorResult<LEDGER_SERVICE>> {
    const actor = await _createActor<LEDGER_SERVICE>(
      ledger_idl,
      ledgerCanisterId ?? LEDGER_CANISTER_ID,
      delegationIdentity,
      host,
    );
    return actor;
  }

  static async createConnectionWithII(
    identity: SignIdentity,
    delegationIdentity: DelegationIdentity,
    legerCanisterId?: string,
  ): Promise<LedgerConnection> {
    const actorResult = await LedgerConnection.createActor(delegationIdentity);
    return LedgerConnection.createConnection(
      identity,
      delegationIdentity,
      legerCanisterId ?? LEDGER_CANISTER_ID,
      actorResult.actor,
      actorResult.agent,
    );
  }

  static async actorGetBalance(
    actor: ActorSubclass<LEDGER_SERVICE>,
    account: AccountIdentifier,
  ): Promise<bigint> {
    const response = await executeWithLogging(() => actor.account_balance_dfx({ account }));
    return response.e8s;
  }

  static async actorSend(
    actor: ActorSubclass<LEDGER_SERVICE>,
    {
      to,
      amount,
      sendOpts,
    }: {
      to: AccountIdentifier;
      amount: bigint;
      sendOpts?: SendOpts;
    },
  ): Promise<BlockHeight> {
    const response = await executeWithLogging(() => {
      const defaultFee = BigInt(10000);
      const defaultMemo = BigInt(Math.floor(Math.random() * 10000));
      const subAccount =
        sendOpts?.from_subaccount === undefined
          ? ([] as [])
          : (Array.from<SubAccount>([fromSubAccountId(sendOpts?.from_subaccount)]) as [SubAccount]);

      const createAtTime =
        sendOpts?.created_at_time === undefined
          ? ([] as [])
          : (Array.from<TimeStamp>([
            {
              timestamp_nanos: BigInt(sendOpts?.created_at_time?.getTime()),
            },
          ]) as [TimeStamp]);

      const sendArgs = {
        to: to,
        fee: {
          e8s: sendOpts?.fee ?? defaultFee,
        },
        amount: { e8s: amount },
        memo: sendOpts?.memo ?? defaultMemo,
        from_subaccount: subAccount,

        created_at_time: createAtTime,
      };

      return actor.send_dfx(sendArgs);
    });
    return response;
  }

  /**
   * get NNS Actor, used internally
   * @param canisterId
   * @param ledgerCanisterId
   * @function {function name}
   * @returns {type} {description}
   */
  async getLedgerActor(ledgerCanisterId?: string): Promise<ActorSubclass<LEDGER_SERVICE>> {
    const actor = await this._getActor(ledgerCanisterId ?? LEDGER_CANISTER_ID, ledger_idl);
    return actor;
  }

  async getBalance(account: AccountIdentifier): Promise<bigint> {
    const actor = await this.getLedgerActor();
    const response = await executeWithLogging(() => actor.account_balance_dfx({ account }));
    return response.e8s;
  }

  async send({
    to,
    amount,
    sendOpts,
  }: {
    to: AccountIdentifier;
    amount: bigint;
    sendOpts: SendOpts;
  }): Promise<BlockHeight> {
    const actor = await this.getLedgerActor();
    const response = await executeWithLogging(() => {
      const defaultFee = BigInt(10000);
      const defaultMemo = BigInt(Math.floor(Math.random() * 10000));
      const subAccount =
        sendOpts?.from_subaccount === undefined
          ? ([] as [])
          : (Array.from<SubAccount>([fromSubAccountId(sendOpts?.from_subaccount)]) as [SubAccount]);

      const createAtTime =
        sendOpts?.created_at_time === undefined
          ? ([] as [])
          : (Array.from<TimeStamp>([
            {
              timestamp_nanos: BigInt(sendOpts?.created_at_time?.getTime()),
            },
          ]) as [TimeStamp]);

      const sendArgs = {
        to: to,
        fee: {
          e8s: sendOpts?.fee ?? defaultFee,
        },
        amount: { e8s: amount },
        memo: sendOpts?.memo ?? defaultMemo,
        from_subaccount: subAccount,

        created_at_time: createAtTime,
      };

      return actor.send_dfx(sendArgs);
    });
    return response;
  }
}

// export const requestNNSDelegation = async (
//   identity: SignIdentity,
// ): Promise<DelegationIdentity> => {
//   const tenMinutesInMsec = 10 * 1000 * 60;
//   const date = new Date(Date.now() + tenMinutesInMsec);
//   return requestDelegation(identity, { canisterId, date });
// };
