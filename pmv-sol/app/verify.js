import {recoverPersonalSignature} from '@metamask/eth-sig-util';


/**
 * Verify the signature
 */
export function makeMessage(publicKey) {
  const body = `Let ${publicKey} claim please`;
  const msg = `0x${Buffer.from(body, 'utf8').toString('hex')}`;
  return msg;
}


/**
 * Verify the signature
 */
export function verify(signature, publicKey) {
  const msg = makeMessage(publicKey);
  const recoveredAddress = recoverPersonalSignature(
      {data: msg, signature: signature});
  return recoveredAddress === publicKey;
}
