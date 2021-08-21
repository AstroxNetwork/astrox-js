import { AnonymousIdentity, Identity, SignIdentity } from '@astrox/agent';
import { blobFromUint8Array, derBlobFromBlob } from '@astrox/candid';
import { Principal } from '@astrox/principal';
import { isDelegationValid } from '@astrox/authentication';
import {
  Delegation,
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
} from '@astrox/identity';

const KEY_SESSIONSTORAGE_KEY = 'identity';
const KEY_SESSIONSTORAGE_DELEGATION = 'delegation';
// const IDENTITY_PROVIDER_DEFAULT = 'https://identity.ic0.app';
const IDENTITY_PROVIDER_DEFAULT = 'https://63k2f-nyaaa-aaaah-aakla-cai.raw.ic0.app';
const IDENTITY_PROVIDER_ENDPOINT = '#authorize';

/**
 * List of options for creating an {@link AuthClient}.
 */
export interface AuthClientCreateOptions {
  /**
   * An identity to use as the base
   */
  identity?: SignIdentity;
  /**
   * Optional storage with get, set, and remove. Uses SessionStorage by default
   */
  storage?: AuthClientStorage;
  // appId
  appId: string;
}

export interface AuthClientLoginOptions {
  /**
   * Identity provider. By default, use the identity service.
   */
  identityProvider?: string | URL;
  /**
   * Experiation of the authentication
   */
  maxTimeToLive?: bigint;
  /**
   * Callback once login has completed
   */
  onSuccess?: () => void;
  /**
   * Callback in case authentication fails
   */
  onError?: (error?: string) => void;
}

/**
 * Interface for persisting user authentication data
 */
export interface AuthClientStorage {
  get(key: string): Promise<string | null>;

  set(key: string, value: string): Promise<void>;

  remove(key: string): Promise<void>;
}

interface InternetIdentityAuthRequest {
  kind: 'authorize-client';
  sessionPublicKey: Uint8Array;
  maxTimeToLive?: bigint;
  appId: string;
}

interface InternetIdentityAuthResponseSuccess {
  kind: 'authorize-client-success';
  delegations: {
    delegation: {
      pubkey: Uint8Array;
      expiration: bigint;
      targets?: Principal[];
    };
    signature: Uint8Array;
  }[];
  userPublicKey: Uint8Array;
}

async function _deleteStorage(storage: AuthClientStorage) {
  await storage.remove(KEY_SESSIONSTORAGE_KEY);
  await storage.remove(KEY_SESSIONSTORAGE_DELEGATION);
}

export class SessionStorage implements AuthClientStorage {
  constructor(public readonly prefix = 'ic-', private readonly _sessionStorage?: Storage) {}

  public get(key: string): Promise<string | null> {
    return Promise.resolve(this._getSessionStorage().getItem(this.prefix + key));
  }

  public set(key: string, value: string): Promise<void> {
    this._getSessionStorage().setItem(this.prefix + key, value);
    return Promise.resolve();
  }

  public remove(key: string): Promise<void> {
    this._getSessionStorage().removeItem(this.prefix + key);
    return Promise.resolve();
  }

  private _getSessionStorage() {
    if (this._sessionStorage) {
      return this._sessionStorage;
    }

    const ls =
      typeof window === 'undefined'
        ? typeof global === 'undefined'
          ? typeof self === 'undefined'
            ? undefined
            : self.sessionStorage
          : global.sessionStorage
        : window.sessionStorage;

    if (!ls) {
      throw new Error('Could not find local storage.');
    }

    return ls;
  }
}

interface AuthReadyMessage {
  kind: 'authorize-ready';
}

interface AuthResponseSuccess {
  kind: 'authorize-client-success';
  delegations: {
    delegation: {
      pubkey: Uint8Array;
      expiration: bigint;
      targets?: Principal[];
    };
    signature: Uint8Array;
  }[];
  userPublicKey: Uint8Array;
}

interface AuthResponseFailure {
  kind: 'authorize-client-failure';
  text: string;
}

type IdentityServiceResponseMessage = AuthReadyMessage | AuthResponse;
type AuthResponse = AuthResponseSuccess | AuthResponseFailure;


export class AuthClient{
  public static async create(options: AuthClientCreateOptions = {appId: ''}): Promise<AuthClient> {
    const storage = options.storage ?? new SessionStorage('ic-');

    let key: null | SignIdentity = null;
    if (options.identity) {
      key = options.identity;
    } else {
      const maybeIdentityStorage = await storage.get(KEY_SESSIONSTORAGE_KEY);
      if (maybeIdentityStorage) {
        try {
          key = Ed25519KeyIdentity.fromJSON(maybeIdentityStorage);
        } catch (e) {
          // Ignore this, this means that the sessionStorage value isn't a valid Ed25519KeyIdentity
          // serialization.
        }
      }
    }

    let identity = new AnonymousIdentity();
    let chain: null | DelegationChain = null;

    if (key) {
      try {
        const chainStorage = await storage.get(KEY_SESSIONSTORAGE_DELEGATION);

        if (chainStorage) {
          chain = DelegationChain.fromJSON(chainStorage);

          // Verify that the delegation isn't expired.
          if (!isDelegationValid(chain)) {
            await _deleteStorage(storage);
            key = null;
          } else {
            identity = DelegationIdentity.fromDelegation(key, chain);
          }
        }
      } catch (e) {
        console.error(e);
        // If there was a problem loading the chain, delete the key.
        await _deleteStorage(storage);
        key = null;
      }
    }

    return new this(identity, key, chain, storage, options.appId);
  }

  protected constructor(
    private _identity: Identity,
    private _key: SignIdentity | null,
    private _chain: DelegationChain | null,
    private _storage: AuthClientStorage,
    private _appId: string,
    // A handle on the IdP window.
    private _idpWindow?: Window,
    // The event handler for processing events from the IdP.
    private _eventHandler?: (event: MessageEvent) => void,
  ) {}

  private _handleSuccess(message: InternetIdentityAuthResponseSuccess, onSuccess?: () => void) {
    const delegations = message.delegations.map(signedDelegation => {
      return {
        delegation: new Delegation(
          blobFromUint8Array(signedDelegation.delegation.pubkey),
          signedDelegation.delegation.expiration,
          signedDelegation.delegation.targets,
        ),
        signature: blobFromUint8Array(signedDelegation.signature),
      };
    });

    const delegationChain = DelegationChain.fromDelegations(
      delegations,
      derBlobFromBlob(blobFromUint8Array(message.userPublicKey)),
    );

    const key = this._key;
    if (!key) {
      return;
    }

    this._chain = delegationChain;
    this._identity = DelegationIdentity.fromDelegation(key, this._chain);

    this._idpWindow?.close();
    onSuccess?.();
    this._removeEventListener();
  }

  public getIdentity(): Identity {
    return this._identity;
  }

  public async isAuthenticated(): Promise<boolean> {
    return !this.getIdentity().getPrincipal().isAnonymous() && this._chain !== null;
  }

  public async login(options?: AuthClientLoginOptions): Promise<void> {
    let key = this._key;
    if (!key) {
      // Create a new key (whether or not one was in storage).
      key = Ed25519KeyIdentity.generate();
      this._key = key;
      await this._storage.set(KEY_SESSIONSTORAGE_KEY, JSON.stringify(key));
    }

    // Create the URL of the IDP. (e.g. https://XXXX/#authorize)
    const identityProviderUrl = new URL(
      options?.identityProvider?.toString() || IDENTITY_PROVIDER_DEFAULT,
    );
    // Set the correct hash if it isn't already set.
    identityProviderUrl.hash = IDENTITY_PROVIDER_ENDPOINT;

    // If `login` has been called previously, then close/remove any previous windows
    // and event listeners.
    this._idpWindow?.close();
    this._removeEventListener();

    // Add an event listener to handle responses.
    this._eventHandler = this._getEventHandler(identityProviderUrl, options);
    window.addEventListener('message', this._eventHandler);

    // Open a new window with the IDP provider.
    this._idpWindow = window.open(identityProviderUrl.toString(), 'idpWindow', 
      'height=500, width=640, top=0, right=0, toolbar=no, menubar=no, scrollbars=no, resizable=no, location=no, status=no'
    ) ?? undefined;
  }

  private _getEventHandler(identityProviderUrl: URL, options?: AuthClientLoginOptions) {
    return async (event: MessageEvent) => {
      if (event.origin !== identityProviderUrl.origin) {
        return;
      }

      const message = event.data as IdentityServiceResponseMessage;

      switch (message.kind) {
        case 'authorize-ready': {
          // IDP is ready. Send a message to request authorization.
          const request: InternetIdentityAuthRequest = {
            kind: 'authorize-client',
            sessionPublicKey: this._key?.getPublicKey().toDer() as Uint8Array,
            maxTimeToLive: options?.maxTimeToLive,
            appId: this._appId,
          };
          this._idpWindow?.postMessage(request, identityProviderUrl.origin);
          break;
        }
        case 'authorize-client-success':
          // Create the delegation chain and store it.
          try {
            this._handleSuccess(message, options?.onSuccess);

            // Setting the storage is moved out of _handleSuccess to make
            // it a sync function. Having _handleSuccess as an async function
            // messes up the jest tests for some reason.
            if (this._chain) {
              await this._storage.set(
                KEY_SESSIONSTORAGE_DELEGATION,
                JSON.stringify(this._chain.toJSON()),
              );
            }
          } catch (err) {
            this._handleFailure(err.message, options?.onError);
          }
          break;
        case 'authorize-client-failure':
          this._handleFailure(message.text, options?.onError);
          break;
        default:
          break;
      }
    };
  }

  private _handleFailure(errorMessage?: string, onError?: (error?: string) => void): void {
    this._idpWindow?.close();
    onError?.(errorMessage);
    this._removeEventListener();
  }

  private _removeEventListener() {
    if (this._eventHandler) {
      window.removeEventListener('message', this._eventHandler);
    }
    this._eventHandler = undefined;
  }

  public async logout(options: { returnTo?: string } = {}): Promise<void> {
    _deleteStorage(this._storage);

    // Reset this auth client to a non-authenticated state.
    this._identity = new AnonymousIdentity();
    this._key = null;
    this._chain = null;

    if (options.returnTo) {
      try {
        window.history.pushState({}, '', options.returnTo);
      } catch (e) {
        window.location.href = options.returnTo;
      }
    }
  }
}
