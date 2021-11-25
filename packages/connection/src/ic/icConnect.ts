/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Actor, ActorSubclass, HttpAgent, Identity } from '@dfinity/agent';
import { InterfaceFactory } from '@dfinity/candid/lib/cjs/idl';
import { Principal } from '@dfinity/principal';
import { AuthClient } from './icAuthClient';
import { IDENTITY_PROVIDER_DEFAULT } from './icStorage';
import { ICWindow } from './icWindow';
import { LedgerConnection } from '../connections/ledgerConnection';
import {
  ConnectOptions,
  EventHandler,
  PermissionsType,
  TransactionMessageKind,
  TransactionOptions,
  TransactionResponseFailure,
  TransactionResponseMessage,
} from '../types';

const days = BigInt(1);
const hours = BigInt(24);
const nanoseconds = BigInt(3600000000000);
const WALLET_PROVIDER_DEFAULT = 'http://localhost:8080/transaction';
const WALLET_PROVIDER_ENDPOINT = '#transaction';

declare global {
  interface Window {
    ic: IC & any;
  }
}

export class IC extends ICWindow {
  public static async connect(connectOptions: ConnectOptions): Promise<IC> {
    const authClient = await AuthClient.create(connectOptions);

    const newIC = new this(authClient);

    const provider = connectOptions?.identityProvider ?? IDENTITY_PROVIDER_DEFAULT;

    if (await newIC.isAuthenticated()) {
      await newIC.handleAuthenticated(newIC, { ledgerCanisterId: connectOptions.ledgerCanisterId });
      await connectOptions?.onAuthenticated?.(newIC);
      return newIC;
    }
    await newIC.getAuthClient().login({
      identityProvider: provider,
      // Maximum authorization expiration is 8 days
      maxTimeToLive: connectOptions?.maxTimeToLive ?? days * hours * nanoseconds,
      permissions: connectOptions?.permissions ?? [PermissionsType.identity],
      onSuccess: async () => {
        await newIC.handleAuthenticated(newIC, {
          ledgerCanisterId: connectOptions.ledgerCanisterId,
        });
        (await connectOptions?.onSuccess?.()) ?? (await connectOptions?.onAuthenticated?.(newIC));
      },
      onError: newIC.handleError,
    });
    return newIC;
  }
  #authClient: AuthClient;
  #agent?: HttpAgent;
  #localLedger?: LedgerConnection; // a local ledger to query balance only
  protected constructor(authClient: AuthClient) {
    super();
    this.#authClient = authClient;
    this.injectWindow();
  }

  public async isAuthenticated(): Promise<boolean> {
    const result = await this.#authClient.isAuthenticated();
    return result;
  }

  public get identity(): Identity {
    return this.#authClient.getIdentity();
  }

  public get principal(): Principal {
    return this.identity.getPrincipal();
  }

  public get wallet(): string | undefined {
    return this.#authClient.wallet;
  }

  protected getAuthClient(): AuthClient {
    return this.#authClient;
  }

  public disconnect = async (options: { returnTo?: string } = {}): Promise<void> => {
    await this.getAuthClient().logout(options);
  };

  public queryBalance = async (): Promise<bigint> => {
    if (this.wallet === undefined) {
      throw Error('Wallet address is not found');
    }
    if (this.#localLedger === undefined) {
      throw Error('Ledger connection faild');
    }
    const result = await this.#localLedger?.getBalance(this.wallet!);
    return result;
  };

  public handleAuthenticated = async (
    ic: IC,
    { ledgerCanisterId }: { ledgerCanisterId?: string },
  ): Promise<IC> => {
    const identity = ic.getAuthClient().getIdentity();

    this.#agent = new HttpAgent({ identity });

    if (!process.env.isProduction) {
      await this.#agent.fetchRootKey();
    }
    this.#localLedger = LedgerConnection.createConnection(
      ic.getAuthClient().getInnerKey()!,
      ic.getAuthClient().getDelegationIdentity()!,
      ledgerCanisterId,
    );

    this.injectWindow(ic);
    return new IC(ic.getAuthClient());
  };

  private injectWindow(ic?: IC): void {
    if (window.ic !== undefined) {
      let plug;
      if (window.ic.plug !== undefined) {
        plug = window.ic.plug;
      }
      window.ic = ic ?? this;
      window.ic.plug = plug;
    } else {
      window.ic = ic ?? this;
    }
  }

  public handleError(error?: string): void {
    throw new Error(error);
  }

  public createActor = <T>(idlFactory: InterfaceFactory, canisterId: string): ActorSubclass<T> => {
    return Actor.createActor<T>(idlFactory, {
      agent: this.#agent,
      canisterId,
    });
  };

  // requestTransfer
  public requestTransfer = async (options: TransactionOptions): Promise<void> => {
    const walletProviderUrl = new URL(
      options?.walletProvider?.toString() || WALLET_PROVIDER_DEFAULT,
    );
    walletProviderUrl.hash = WALLET_PROVIDER_ENDPOINT;
    this._openWindow(
      walletProviderUrl.toString(),
      'icWindow',
      'height=600, width=480, top=0, right=0, toolbar=no, menubar=no, scrollbars=no, resizable=no, location=no, status=no',
    );

    return new Promise((resolve, reject) => {
      this._eventHandler = this._getEventHandler(walletProviderUrl, resolve, reject, options);
      window.addEventListener('message', this._eventHandler);
    });
  };

  private _getEventHandler(
    walletProviderUrl: URL,
    resolve: (value: any) => void,
    reject: (reason?: any) => void,
    options?: TransactionOptions,
  ): EventHandler {
    return async (event: MessageEvent) => {
      if (event.origin !== walletProviderUrl.origin) {
        return;
      }

      const message = event.data as TransactionResponseMessage;

      switch (message.kind) {
        case TransactionMessageKind.ready: {
          // IDP is ready. Send a message to request authorization.

          const request: { kind: TransactionMessageKind } & TransactionOptions = {
            kind: TransactionMessageKind.client,
            ...options!,
          };
          this._window?.postMessage(request, walletProviderUrl.origin);
          break;
        }
        case TransactionMessageKind.success:
          // Create the delegation chain and store it.
          try {
            resolve(null);

            // Setting the storage is moved out of _handleSuccess to make
            // it a sync function. Having _handleSuccess as an async function
            // messes up the jest tests for some reason.
          } catch (err) {
            reject(this._handleFailure((err as Error).message, options?.onError));
          }
          break;
        case TransactionMessageKind.fail:
          reject(
            this._handleFailure(
              (message as unknown as TransactionResponseFailure).text,
              options?.onError,
            ),
          );
          break;
        default:
          break;
      }
    };
  }
  private _handleFailure(
    errorMessage?: string,
    onError?: (error?: string) => void,
  ): string | undefined {
    this._window?.close();
    onError?.(errorMessage);
    this._removeEventListener();
    return errorMessage;
  }
}
