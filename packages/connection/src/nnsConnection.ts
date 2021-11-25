/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ActorSubclass,
  DerEncodedPublicKey,
  HttpAgent,
  Signature,
  SignIdentity,
} from '@astrox/agent';
import { DelegationIdentity } from '@astrox/identity';

import {
  BaseConnection,
  CreateActorResult,
  executeWithLogging,
  _createActor,
} from './baseConnection';
import nns_idl from './canisters/nns-dapp.idl';
import nns_idl_cert from './canisters/nns-dapp-cert.idl';
import NNS_SERVICE, { AccountDetails } from './canisters/nns-dapp';
import { NNS_CANISTER_ID } from './utils/constants';

// const canisterId: string = process.env.NNS_CANISTER_ID!;
// const NNS_URL: string = process.env.NNS_URL!;

// export const canisterIdPrincipal: Principal = Principal.fromText(canisterId);

// const KEY_SESSIONSTORAGE_KEY = 'identity';
// const KEY_SESSIONSTORAGE_DELEGATION = 'delegation';

export class NNSConnection extends BaseConnection<NNS_SERVICE> {
  public get accountDetails(): AccountDetails | undefined {
    return this._accountDetails;
  }

  private _accountDetails?: AccountDetails;

  protected constructor(
    public identity: SignIdentity,
    public delegationIdentity: DelegationIdentity,
    public actor?: ActorSubclass<NNS_SERVICE>,
    public agent?: HttpAgent,
    nnsCanisterId?: string,
  ) {
    super(identity, delegationIdentity, nnsCanisterId ?? NNS_CANISTER_ID, nns_idl, actor, agent);
  }

  /**
   * create connection
   * @param identity
   * @param delegationIdentity
   * @param actor
   * @param agent
   * @function createConnection
   * @returns {NNSConnection}
   */
  static createConnection(
    identity: SignIdentity,
    delegationIdentity: DelegationIdentity,
    actor?: ActorSubclass<NNS_SERVICE>,
    agent?: HttpAgent,
  ): NNSConnection {
    return new NNSConnection(identity, delegationIdentity, actor, agent);
  }

  /**
   * create Actor with DelegationIdentity
   * @param delegationIdentity
   * @param nnsCanisterId
   * @function {function name}
   * @returns {type} {description}
   */
  static async createActor(
    delegationIdentity: DelegationIdentity,
    nnsCanisterId?: string,
  ): Promise<CreateActorResult<NNS_SERVICE>> {
    const actor = await _createActor<NNS_SERVICE>(
      nns_idl,
      nnsCanisterId ?? NNS_CANISTER_ID,
      delegationIdentity,
    );
    return actor;
  }

  // /**
  //  * create connection with II, we need to login II before login to NNS
  //  * only when AstroX ME linked With II, use 2 params as input
  //  * 1. use Identity created by devices, not delegation
  //  * 2. use II anchor that linked, will ensure NNS Dapp get the correct principal
  //  *
  //  * @param identity
  //  * @param anchor
  //  * @function {function name}
  //  * @returns {type} {description}
  //  */
  // static async createConnectionWithII(
  //   identity: SignIdentity,
  //   anchor: string | bigint,
  // ): Promise<NNSConnection> {
  //   const key = Ed25519KeyIdentity.generate();
  //   const s = await iiDelegation(
  //     identity,
  //     new Uint8Array(key.getPublicKey().toDer()),
  //     anchor,
  //     NNS_URL,
  //     /* days */ BigInt(7) * /* hours */ BigInt(24) * /* nanoseconds */ BigInt(3600000000000),
  //   );
  //   const iiDelegationResult = {
  //     kind: 'authorize-client-success',
  //     delegations: [s],
  //     userPublicKey: Uint8Array.from(s.userKey),
  //   };
  //   const storage = new NNSStorage(anchor.toString());
  //   const delegations = iiDelegationResult.delegations.map(signedDelegation => {
  //     return {
  //       delegation: new Delegation(
  //         signedDelegation.delegation.pubkey.buffer,
  //         signedDelegation.delegation.expiration,
  //         signedDelegation.delegation.targets,
  //       ),
  //       signature: signedDelegation.signature.buffer as Signature,
  //     };
  //   });
  //   const delegationChain = DelegationChain.fromDelegations(
  //     delegations,
  //     iiDelegationResult.userPublicKey.buffer as DerEncodedPublicKey,
  //   );
  //   await storage.saveJson({
  //     delegationChain: delegationChain.toJSON(),
  //     key,
  //   });

  //   const delegationResult = (await handleDelegation(iiDelegationResult, key)) as DelegationResult;

  //   const actorResult = await NNSConnection.createActor(delegationResult.delegationIdentity);
  //   return NNSConnection.createConnection(
  //     identity,
  //     delegationResult.delegationIdentity,
  //     actorResult.actor,
  //     actorResult.agent,
  //   );
  // }

  /**
   * get NNS Actor, used internally
   * @param nnsCanisterId
   * @function {function name}
   * @returns {type} {description}
   */
  async getNNSActor(nnsCanisterId?: string): Promise<ActorSubclass<NNS_SERVICE>> {
    const actor = await this._getActor(nnsCanisterId ?? NNS_CANISTER_ID, nns_idl);
    return actor;
  }

  /**
   * get NNS Actor, used internally
   * @param nnsCanisterId
   * @function {function name}
   * @returns {type} {description}
   */
  async getNNSActorCert(nnsCanisterId?: string): Promise<ActorSubclass<NNS_SERVICE>> {
    const actor = await this._getActor(nnsCanisterId ?? NNS_CANISTER_ID, nns_idl_cert);
    return actor;
  }

  /**
   * when NNSConnection is created, we can get account created to NNS.
   * Even we can just calculate the login principal to NNS DApp, however,
   * The NNS DApp stores and create account, thus, a new Identity login will get NO ACCOUNT created by default.
   * We need to manually create account using `add_account` when no account found.
   *
   * @param cert
   * @function {function name}
   * @returns {type} {description}
   */
  async getAccount(cert?: boolean): Promise<AccountDetails | undefined> {
    const actor = cert === true ? await this.getNNSActorCert() : await this.getNNSActor();
    const response = await executeWithLogging(() => actor.get_account());
    if (response === { AccountNotFound: null }) {
      return undefined;
    } else {
      this._accountDetails = (response as { Ok: AccountDetails })['Ok'] as AccountDetails;
      return (response as { Ok: AccountDetails })['Ok'] as AccountDetails;
    }
  }

  /**
   * create account when new identity logined to NNS
   * @function {function name}
   * @returns {type} {description}
   */
  async addAccount(): Promise<string> {
    const actor = await this.getNNSActor();
    const response = await executeWithLogging(() => actor.add_account());
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
