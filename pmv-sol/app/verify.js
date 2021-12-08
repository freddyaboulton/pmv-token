import {recoverPersonalSignature} from '@metamask/eth-sig-util';


/**
 * Make hashed message
 * @param {string} publicKey - public key of user that signed the message.
 * @return {string} message before signing.
 */
export function makeMessage(publicKey) {
  const body = `Let ${publicKey} claim please`;
  const msg = `0x${Buffer.from(body, 'utf8').toString('hex')}`;
  return msg;
}


/**
 * Verify the signature
 * @param {string} signature - signature from user.
 * @param {string} publicKey - public key of user that signed the message.
 * @return {bool} True if signature was signed by publicKey.
 */
export function verify(signature, publicKey) {
  const msg = makeMessage(publicKey);
  const recoveredAddress = recoverPersonalSignature(
      {data: msg, signature: signature});
  return recoveredAddress === publicKey;
}
