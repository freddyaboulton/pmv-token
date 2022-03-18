import {createRequire} from 'module';
const require = createRequire(import.meta.url);
const anchor = require('@project-serum/anchor');
import {
  getTokenWallet, getCandyMachine, getMetadata, findClaimStatusKey,
  getMasterEdition, program, provider,
  createAssociatedTokenAccountInstruction,
} from './helpers.js';
import {MintLayout, Token} from '@solana/spl-token';
import {AUTHORITY, CONFIG, UUID,
  TOKEN_PROGRAM_ID, TOKEN_METADATA_PROGRAM_ID} from './constants.js';
import {SystemProgram} from '@solana/web3.js';
import {Metadata} from '@metaplex-foundation/mpl-token-metadata';


/**
 * Mint token to a given SOL address.
 * @param {string} ethAddress - SOL Address.
 * @param {string} solAddress - SOL Address.
 * @param {int} tokenIndex - Max allowed to mint.
 * @return {transaction} Solana transaction.
 */
export async function mintToken(ethAddress, solAddress, tokenIndex) {
  const destination = new anchor.web3.PublicKey(solAddress);
  const mint = anchor.web3.Keypair.generate();
  const token = await getTokenWallet(
      destination,
      mint.publicKey,
  );
  const metadata = await getMetadata(mint.publicKey);
  const masterEdition = await getMasterEdition(mint.publicKey);
  const [candyMachine] = await getCandyMachine(
      CONFIG,
      UUID,
  );
  const [claimStatus, bump] = await findClaimStatusKey(tokenIndex,
      candyMachine);
  const tx = await program.rpc.mintNft(
      new anchor.BN(bump),
      new anchor.BN(tokenIndex),
      ethAddress,
      solAddress,
      {
        accounts: {
          config: CONFIG,
          candyMachine: candyMachine,
          claimStatus: claimStatus,
          payer: AUTHORITY.publicKey,
          wallet: AUTHORITY.publicKey,
          mint: mint.publicKey,
          metadata: metadata,
          masterEdition: masterEdition,
          mintAuthority: AUTHORITY.publicKey,
          updateAuthority: AUTHORITY.publicKey,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [mint, AUTHORITY],
        instructions: [
          anchor.web3.SystemProgram.createAccount({
            fromPubkey: AUTHORITY.publicKey,
            newAccountPubkey: mint.publicKey,
            space: MintLayout.span,
            lamports:
                    await provider.connection.getMinimumBalanceForRentExemption(
                        MintLayout.span,
                    ),
            programId: TOKEN_PROGRAM_ID,
          }),
          Token.createInitMintInstruction(
              TOKEN_PROGRAM_ID,
              mint.publicKey,
              0,
              AUTHORITY.publicKey,
              AUTHORITY.publicKey,
          ),
          createAssociatedTokenAccountInstruction(
              token,
              AUTHORITY.publicKey,
              destination,
              mint.publicKey,
          ),
          Token.createMintToInstruction(
              TOKEN_PROGRAM_ID,
              mint.publicKey,
              token,
              AUTHORITY.publicKey,
              [],
              1,
          ),
        ],
      });
  return [tx, mint.publicKey.toString()];
}


/**
 * Verify if tokenIndex has been claimed
 * @param {int} tokenIndex - Max allowed to mint.
 * @return {bool} {isClaimed: bool}.
 */
export async function isClaimed(tokenIndex) {
  const [candyMachine] = await getCandyMachine(
      CONFIG,
      UUID,
  );
  const [key] = await findClaimStatusKey(tokenIndex, candyMachine);
  const status = await program.account.claimStatus.fetchNullable(key);
  if (status == null) {
    return {'isClaimed': false,
      'ethAddress': '',
      'solAddress': ''};
  } else {
    return status;
  }
}

export const createdByOurCandyMachine = (data, candyMachineAddress) => {
  if (data.creators == null) {
    return false;
  } else if (data.creators.length == 0) {
    return false;
  } else {
    return data.creators[0].address === candyMachineAddress;
  }
};

/**
 * Get all POMV NFTS owned by an address
 * @param {str} publicKey - Address
 * @return {JSON} list of token addresses owned by this address
 */
export async function getTokensOfOwner(publicKey) {
  const allNFTs = await Metadata.findDataByOwner(provider.connection,
      publicKey);
  const [candyMachine] = await getCandyMachine(
      CONFIG,
      UUID,
  );
  const candyMachineAddress = candyMachine.toString();
  // Our candy machine is always the first creator
  return {'tokens': allNFTs.filter((token) =>
    createdByOurCandyMachine(token.data, candyMachineAddress))};
}
