/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { AuthClientStorage } from '../types';

export const KEY_SESSIONSTORAGE_KEY = 'identity';
export const KEY_SESSIONSTORAGE_DELEGATION = 'delegation';
export const KEY_SESSIONSTORAGE_WALLET = 'wallet';
export const IDENTITY_PROVIDER_DEFAULT = 'https://identity.ic0.app';
export const IDENTITY_PROVIDER_ENDPOINT = '#authorize';

export async function _deleteStorage(storage: AuthClientStorage) {
  await storage.remove(KEY_SESSIONSTORAGE_KEY);
  await storage.remove(KEY_SESSIONSTORAGE_DELEGATION);
  await storage.remove(KEY_SESSIONSTORAGE_WALLET);
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
