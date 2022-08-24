/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { EventHandler } from '../types';

export class ICWindow {
  protected _window?: Window;
  protected _eventHandler?: EventHandler;

  protected _removeEventListener() {
    if (this._eventHandler) {
      window.removeEventListener('message', this._eventHandler);
    }
    this._eventHandler = undefined;
  }

  protected _openWindow(url: string, target?: string, feature?: string) {
    this._remove();
    // Open a new window with the IDP provider.
    this._window = window.open(url, target ?? 'icWindow', feature) ?? undefined;
  }

  protected _remove() {
    this._window?.close();
    this._removeEventListener();
  }
}
