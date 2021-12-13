import {recoverPersonalSignature} from '@metamask/eth-sig-util';
import {ethers} from 'ethers';


/**
 * Make hashed message.
 * @return {string} message before signing.
 */
export function makeMessage() {
  const body = `Let me claim please`;
  const msg = `0x${Buffer.from(body, 'utf8').toString('hex')}`;
  return msg;
}


/**
 * Verify the signature
 * @param {string} signature - signature from user.
 * @param {string} publicKey - public key of user that signed the message.
 *  Must be checksummed.
 * @return {bool} True if signature was signed by publicKey.
 */
export function verify(signature, publicKey) {
  const msg = makeMessage();
  const recoveredAddress = recoverPersonalSignature(
      {data: msg, signature: signature});
  return ethers.utils.getAddress(recoveredAddress) === publicKey;
}
