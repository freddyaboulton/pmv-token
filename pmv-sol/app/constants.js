import {createRequire} from 'module';
const require = createRequire(import.meta.url);

const fs = require('fs');

import {PublicKey} from '@solana/web3.js';
const anchor = require('@project-serum/anchor');

export const TOKEN_PROGRAM_ID = new PublicKey(
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);
export const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);
export const CANDY_MACHINE = 'candy_machine';

export let myWallet;

if (typeof process.env.SECRET_KEY !== 'undefined') {
  myWallet = anchor.web3.Keypair.fromSecretKey(
      new Uint8Array(
          JSON.parse(process.env.SECRET_KEY),
      ));
} else {
  if (typeof process.env.MY_WALLET === 'undefined') {
    throw new Error('variable MY_WALLET must be set if SECRET_KEY is not set');
  }
  myWallet = anchor.web3.Keypair.fromSecretKey(
      new Uint8Array(
          JSON.parse(fs.readFileSync(process.env.MY_WALLET, 'utf8')),
      ));
}

export const walletWrapper = new anchor.Wallet(myWallet);


export const CONFIG_ARRAY_START =
    32 + // authority
    4 +
    6 + // uuid + u32 len
    4 +
    10 + // u32 len + symbol
    2 + // seller fee basis points
    1 +
    4 +
    5 * 34 + // optional + u32 len + actual vec
    8 + // max supply
    1 + // is mutable
    1 + // retain authority
    4; // max number of lines;


export const CONFIG = new anchor.web3.PublicKey(
    fs.readFileSync('./latest_config_public_key.txt').toString(),
);

export const AUTHORITY = myWallet;
export const UUID = fs.readFileSync('./latest_uuid.txt').toString();

