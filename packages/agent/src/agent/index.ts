import { GlobalInternetComputer, Kraken } from '../index';
import { Agent } from './api';

export * from './api';
export * from './http';
export * from './proxy';

declare const window: GlobalInternetComputer;
declare const global: GlobalInternetComputer;
declare const self: GlobalInternetComputer;

export function getDefaultAgent(): Agent {
  const agent =
    typeof window === 'undefined'
      ? typeof global === 'undefined'
        ? typeof self === 'undefined'
          ? undefined
          : self.ic.astrox?.agent
        : global.ic.astrox?.agent
      : window.ic.astrox?.agent;

  if (!agent) {
    throw new Error('No Agent could be found.');
  }

  return agent;
}

export function getKraken(): Kraken | undefined {
  const kraken =
    typeof window === 'undefined'
      ? typeof global === 'undefined'
        ? typeof self === 'undefined'
          ? undefined
          : self.kraken
        : global.kraken
      : window.kraken;

  return kraken;
}
