import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { PublicKey } from "@solana/web3.js";
const anchor = require('@project-serum/anchor');

const myWallet = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(
        JSON.parse(require("fs").readFileSync(process.env.MY_WALLET, "utf8"))
    )
);

export const TOKEN_PROGRAM_ID = new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
export const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
export const CANDY_MACHINE = "candy_machine";

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
    8 + //max supply
    1 + //is mutable
    1 + // retain authority
    4; // max number of lines;



export const CONFIG = anchor.web3.Keypair.generate();
export const AUTHORITY = myWallet;
export const UUID = anchor.web3.Keypair.generate().publicKey.toBase58().slice(0, 6);


