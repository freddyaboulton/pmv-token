import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import bs58 from 'bs58';
import { getCandyMachine } from './helpers.js';
import { CONFIG, UUID } from './constants.js';

const connection = new Connection(clusterApiUrl('devnet'));
// const MAX_NAME_LENGTH = 6;
// const MAX_URI_LENGTH = 0;
// const MAX_SYMBOL_LENGTH = 10;
// const MAX_CREATOR_LEN = 32 + 1 + 1;
// const MAX_CREATOR_LIMIT = 5;
// const MAX_DATA_SIZE = 4 + MAX_NAME_LENGTH + 4 + MAX_SYMBOL_LENGTH + 4 + MAX_URI_LENGTH + 2 + 1 + 4 + MAX_CREATOR_LIMIT * MAX_CREATOR_LEN;
// const MAX_METADATA_LEN = 1 + 32 + 32 + MAX_DATA_SIZE + 1 + 1 + 9 + 172;
// const CREATOR_ARRAY_START = 1 + 32 + 32 + 4 + MAX_NAME_LENGTH + 4 + MAX_URI_LENGTH + 4 + MAX_SYMBOL_LENGTH + 2 + 1 + 4;

const MAX_NAME_LENGTH = 32;
const MAX_URI_LENGTH = 200;
const MAX_SYMBOL_LENGTH = 10;
const MAX_CREATOR_LEN = 32 + 1 + 1;
const MAX_CREATOR_LIMIT = 5;
const MAX_DATA_SIZE = 4 + MAX_NAME_LENGTH + 4 + MAX_SYMBOL_LENGTH + 4 + MAX_URI_LENGTH + 2 + 1 + 4 + MAX_CREATOR_LIMIT * MAX_CREATOR_LEN;
const MAX_METADATA_LEN = 1 + 32 + 32 + MAX_DATA_SIZE + 1 + 1 + 9 + 172;
const CREATOR_ARRAY_START = 1 + 32 + 32 + 4 + MAX_NAME_LENGTH + 4 + MAX_URI_LENGTH + 4 + MAX_SYMBOL_LENGTH + 2 + 1 + 4;


const TOKEN_METADATA_PROGRAM = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const [candyMachineAddress, _] = await getCandyMachine(new PublicKey(CONFIG), UUID);
console.log(candyMachineAddress);

const getMintAddresses = async (firstCreatorAddress) => {
  const metadataAccounts = await connection.getProgramAccounts(
    TOKEN_METADATA_PROGRAM,
    {
      // The mint address is located at byte 33 and lasts for 32 bytes.
      dataSlice: { offset: 33, length: 32 },

      filters: [
        // Only get Metadata accounts.
        { dataSize: MAX_METADATA_LEN },

        // Filter using the first creator.
        {
          memcmp: {
            offset: CREATOR_ARRAY_START,
            bytes: firstCreatorAddress.toBase58(),
          },
        },
      ],
    },
  );

  return metadataAccounts.map((metadataAccountInfo) => (
    bs58.encode(metadataAccountInfo.account.data)
  ));
};

const getNFTsOwnedBy = async (publicKey) => {
  return Metadata.findDataByOwner(connection, publicKey);
}


const tokensOfOwner = async (publicKey) => {
  const allMintedNFTs = new Set(await getMintAddresses(candyMachineAddress));
  const allNFTsOwnedbyAddress = await getNFTsOwnedBy(publicKey);
  return allNFTsOwnedbyAddress.filter(metadata => allMintedNFTs.has(metadata.mint));
}


console.time("Original Method");
const allTokens = await tokensOfOwner('9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9');
console.log(allTokens);
console.timeEnd("Original Method");

console.time("new method");
const allNFTs = await getNFTsOwnedBy('9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9');
const desiredNFTs = allNFTs.filter(token => token.data.creators[0].address === candyMachineAddress.toString());
console.log(desiredNFTs);
console.timeEnd("new method");
