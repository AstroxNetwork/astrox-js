import {
  Actor,
  ActorSubclass,
  DerEncodedPublicKey,
  HttpAgent,
  Signature,
  SignIdentity,
} from '@dfinity/agent';
// import { blobFromUint8Array, derBlobFromBlob } from '@dfinity/candid';
import { InterfaceFactory } from '@dfinity/candid/lib/cjs/idl';
import {
  Delegation,
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
} from '@dfinity/identity';
import { Principal } from '@dfinity/principal';

export interface CreateActorResult<T> {
  actor: ActorSubclass<T>;
  agent: HttpAgent;
}

export function createConnection<T>(
  identity: SignIdentity,
  delegationIdentity: DelegationIdentity,
  canisterId: string,
  interfaceFactory: InterfaceFactory,
  actor?: ActorSubclass<T>,
  agent?: HttpAgent,
): BaseConnection<T> {
  return new BaseConnection<T>(
    identity,
    delegationIdentity,
    canisterId,
    interfaceFactory,
    actor,
    agent,
  );
}

export const requestDelegation = async (
  identity: SignIdentity,
  { canisterId, date }: { canisterId?: string; date?: Date },
): Promise<DelegationIdentity> => {
  const sessionKey = Ed25519KeyIdentity.generate();
  const chain = await DelegationChain.create(
    identity,
    sessionKey.getPublicKey(),
    date || new Date(Date.parse('2100-01-01')),
    {
      targets: canisterId != undefined ? [Principal.fromText(canisterId)] : undefined,
    },
  );

  return DelegationIdentity.fromDelegation(sessionKey, chain);
};

export async function _createActor<T>(
  interfaceFactory: InterfaceFactory,
  canisterId: string,
  identity?: SignIdentity,
): Promise<CreateActorResult<T>> {
  const agent = new HttpAgent({ identity });
  // Only fetch the root key when we're not in prod
  if (process.env.II_ENV === 'development') {
    await agent.fetchRootKey();
  }
  const actor = Actor.createActor<T>(interfaceFactory, {
    agent,
    canisterId,
  });
  return { actor, agent };
}

export interface AbstractConnection<T> {
  identity: SignIdentity;
  delegationIdentity: DelegationIdentity;
  actor?: ActorSubclass<T>;
  agent?: HttpAgent;
  canisterId?: string;
  getActor(): Promise<ActorSubclass<T>>;
}

export class BaseConnection<T> implements AbstractConnection<T> {
  constructor(
    public identity: SignIdentity,
    public delegationIdentity: DelegationIdentity,
    public canisterId: string,
    public interfaceFactory: InterfaceFactory,
    public actor?: ActorSubclass<T>,
    public agent?: HttpAgent,
  ) {}
  async getActor(): Promise<ActorSubclass<T>> {
    throw new Error('Method not implemented.');
  }

  protected async _getActor(
    canisterId: string,
    interfaceFactory: InterfaceFactory,
    date?: Date,
  ): Promise<ActorSubclass<T>> {
    for (const { delegation } of this.delegationIdentity.getDelegation().delegations) {
      // prettier-ignore
      if (+new Date(Number(delegation.expiration / BigInt(1000000))) <= +Date.now()) {
        this.actor = undefined;
        break;
      }
    }
    if (this.actor === undefined) {
      // Create our actor with a DelegationIdentity to avoid re-prompting auth
      this.delegationIdentity = await requestDelegation(this.identity, {
        canisterId: this.canisterId ?? canisterId,
        date: date ?? undefined,
      });
      this.actor = (
        await _createActor<T>(
          interfaceFactory,
          this.canisterId ?? canisterId,
          this.delegationIdentity,
        )
      ).actor as ActorSubclass<T>;
    }
    return this.actor;
  }
}

export interface IIDelegationResult {
  delegation: {
    pubkey: Uint8Array;
    expiration: bigint;
    targets?: Principal[];
  };
  signature: Uint8Array;
}

export interface DelegationMessage {
  kind: string;
  delegations: IIDelegationResult[];
  userPublicKey: Uint8Array;
}

export interface DelegationResult {
  delegationIdentity: DelegationIdentity;
  delegationChain: DelegationChain;
}

export async function handleDelegation(
  message: DelegationMessage,
  key: SignIdentity,
): Promise<DelegationResult> {
  const delegations = message.delegations.map(signedDelegation => {
    return {
      delegation: new Delegation(
        signedDelegation.delegation.pubkey,
        signedDelegation.delegation.expiration,
        signedDelegation.delegation.targets,
      ),
      signature: signedDelegation.signature.buffer as Signature,
    };
  });

  const delegationChain = DelegationChain.fromDelegations(
    delegations,
    message.userPublicKey.buffer as DerEncodedPublicKey,
  );
  return {
    delegationChain,
    delegationIdentity: DelegationIdentity.fromDelegation(key, delegationChain),
  };
}

export const executeWithLogging = async <T>(func: () => Promise<T>): Promise<T> => {
  try {
    return await func();
  } catch (e) {
    console.log(e);
    throw e;
  }
};
