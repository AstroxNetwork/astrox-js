import { resourceLimits } from 'worker_threads';
import { getKraken } from '../index';
import init, { bls_init, bls_verify } from '../vendor/bls/bls';

export let verify: (pk: Uint8Array, sig: Uint8Array, msg: Uint8Array) => Promise<boolean>;

/**
 *
 * @param pk primary key: Uint8Array
 * @param sig signature: Uint8Array
 * @param msg message: Uint8Array
 * @returns Promise resolving a boolean
 */
export async function blsVerify(
  pk: Uint8Array,
  sig: Uint8Array,
  msg: Uint8Array,
): Promise<boolean> {
  if (!verify) {
    const kraken = getKraken();

    if (!kraken) {
      await init();
      if (bls_init() !== 0) {
        throw new Error('Cannot initialize BLS');
      }
      verify = async (pk1, sig1, msg1) => {
        // Reorder things from what the WASM expects (sig, m, w).
        return bls_verify(sig1, msg1, pk1) === 0;
      };
    } else {
      const isInit = await kraken.methodChannel.invokeMethod('agent/blsInit', []);
      if (!isInit) {
        throw new Error('Cannot initialize BLS');
      }
      verify = async (pk1, sig1, msg1) => {
        // Reorder things from what the WASM expects (sig, m, w).
        const verifyResult = await kraken.methodChannel.invokeMethod('agent/blsVerify', [
          Buffer.from(pk1).toString('hex'),
          Buffer.from(sig1).toString('hex'),
          new TextDecoder().decode(msg1),
        ]);
        return verifyResult === 0;
      };
    }
  }
  const result = await verify(pk, sig, msg);
  return result;
}
