import {PublicKey} from '@solana/web3.js';
import {ethers} from 'ethers';


/**
 * Validate Solana Address
 * @param {string} address - Solana Address to validate.
 * @raise {Error} If it is an invalid solana address.
 * @return {bool} If it is a valid SolAddress.
 */
export function isValidSolAddress(address) {
  let isValidSolAddress;
  try {
    const solAddress = new PublicKey(address);
    isValidSolAddress = PublicKey.isOnCurve(solAddress.toBytes());
  } catch (e) {
    throw new Error('Invalid Sol Address');
  }
  if (!isValidSolAddress) {
    throw new Error('Invalid Sol Address');
  }
  return true;
}


/**
 * Validate Eth Address
 * @param {string} address - Eth address to validate.
 * @raise {Error} If it is an invalid Eth address.
 * @return {bool} If it is a valid Eth address.
 */
export function isValidEthAddress(address) {
  if (!ethers.utils.isAddress(address)) {
    throw new Error('Invalid Eth Address');
  }
  return true;
}
