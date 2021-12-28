/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { AuthClientStorage } from '../types';

export const KEY_ICSTORAGE_KEY = 'identity';
export const KEY_ICSTORAGE_DELEGATION = 'delegation';
export const KEY_ICSTORAGE_WALLET = 'wallet';
export const IDENTITY_PROVIDER_DEFAULT = 'https://identity.ic0.app';
export const IDENTITY_PROVIDER_ENDPOINT = '#authorize';

export async function _deleteStorage(storage: AuthClientStorage) {
  await storage.remove(KEY_ICSTORAGE_KEY);
  await storage.remove(KEY_ICSTORAGE_DELEGATION);
  await storage.remove(KEY_ICSTORAGE_WALLET);
}

export class ICStorage implements AuthClientStorage {
  constructor(public readonly prefix = 'ic-', private readonly _localStorage?: Storage) { }

  public get(key: string): Promise<string | null> {
    return Promise.resolve(this._getICStorage().getItem(this.prefix + key));
  }

  public set(key: string, value: string): Promise<void> {
    this._getICStorage().setItem(this.prefix + key, value);
    return Promise.resolve();
  }

  public remove(key: string): Promise<void> {
    this._getICStorage().removeItem(this.prefix + key);
    return Promise.resolve();
  }

  private _getICStorage() {
    if (this._localStorage) {
      return this._localStorage;
    }

    const ls =
      typeof window === 'undefined'
        ? typeof global === 'undefined'
          ? typeof self === 'undefined'
            ? undefined
            : self.localStorage
          : global.localStorage
        : window.localStorage;

    if (!ls) {
      throw new Error('Could not find local storage.');
    }

    return ls;
  }
}
