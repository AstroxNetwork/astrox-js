import { SignIdentity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IC } from './icConnect';
import { AccountIdentifier } from '../utils/common/types';

import { SendOpts } from '../connections/ledgerConnection';

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
  appId?: string;
  idpWindowOption?: string;
}

export interface AuthClientLoginOptions extends AuthClientCreateOptions {
  /**
   * Identity provider. By default, use the identity service.
   */
  identityProvider?: string | URL;

  permissions?: PermissionsType[];
  /**
   * Experiation of the authentication
   */
  maxTimeToLive?: bigint;
  /**
   * Callback once login has completed
   */
  onSuccess?: () => void | Promise<void>;
  /**
   * Callback in case authentication fails
   */
  onError?: (error?: string) => void;

  /**
   * Callback once is authenticated
   */
  onAuthenticated?: (ic: IC) => void | Promise<void>;
}

export interface TransactionOptions {
  /**
   * Identity provider. By default, use the identity service.
   */
  walletProvider?: string | URL;
  from: AccountIdentifier;
  to: AccountIdentifier;
  amount: bigint;
  sendOpts: SendOpts;
  /**
   * Callback once login has completed
   */
  onSuccess?: () => void | Promise<void>;
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

export interface InternetIdentityAuthRequest {
  kind: 'authorize-client';
  sessionPublicKey: Uint8Array;
  permissions?: PermissionsType[];
  maxTimeToLive?: bigint;
  appId?: string;
}

export interface DelegationResult {
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

export interface MeAuthResponseSuccess {
  kind: 'authorize-client-success';
  identity: DelegationResult;
  wallet?: string;
}

export interface IIAuthResponseSuccess extends DelegationResult {
  kind: 'authorize-client-success';
}

export type AuthResponseSuccess = MeAuthResponseSuccess | IIAuthResponseSuccess;

export type EventHandler = (event: MessageEvent) => Promise<void>;

export enum PermissionsType {
  identity = 'permissions-identity',
  wallet = 'permissions-wallet',
}

export type ConnectOptions = AuthClientLoginOptions;

// Transaction Types
export enum TransactionMessageKind {
  client = 'transaction-client',
  ready = 'transaction-ready',
  success = 'transaction-client-success',
  fail = 'transaction-client-failure',
}

export interface TransactionReadyMessage {
  kind: TransactionMessageKind.ready;
}

export interface TransactionResponseFailure {
  kind: TransactionMessageKind.fail;
  text: string;
}

export interface TransactionResponseSuccess {
  kind: TransactionMessageKind.success;
}

export type TransactionResponseMessage = TransactionReadyMessage | TransactionResponse;
export type TransactionResponse = TransactionResponseSuccess | TransactionResponseFailure;

export interface AuthReadyMessage {
  kind: 'authorize-ready';
}

export interface AuthResponseFailure {
  kind: 'authorize-client-failure';
  text: string;
}

export type IdentityServiceResponseMessage = AuthReadyMessage | AuthResponse;
export type AuthResponse = AuthResponseSuccess | AuthResponseFailure;
