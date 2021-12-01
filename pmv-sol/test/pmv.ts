import * as anchor from "@project-serum/anchor";

import assert from "assert";
import chai, { expect } from "chai";

import { AccountLayout, MintLayout, Token } from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import type { SendTransactionError } from "@solana/web3.js";
import { CandyMachine, Config } from "./nft-candy-machine-types";
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export function createAssociatedTokenAccountInstruction(
  associatedTokenAddress: PublicKey,
  payer: PublicKey,
  walletAddress: PublicKey,
  splTokenMintAddress: PublicKey
) {
  const keys = [
    {
      pubkey: payer,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: associatedTokenAddress,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: walletAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: splTokenMintAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new TransactionInstruction({
    keys,
    programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    data: Buffer.from([]),
  });
}
const configArrayStart =
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
const configLineSize = 4 + 32 + 4 + 200;

const CANDY_MACHINE = "candy_machine";
describe("nft-candy-machine", function () {
  // Configure the client to use the local cluster.
  const idl = JSON.parse(
    require("fs").readFileSync("./target/idl/nft_candy_machine.json", "utf8")
  );
  const myWallet = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(require("fs").readFileSync(process.env.MY_WALLET, "utf8"))
    )
  );

  const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com/",
    "recent"
  );

  // Address of the deployed program.
  const programId = new anchor.web3.PublicKey(
    "2MvgrbsWoramiYaBBE9pqhXcg72ByZvbMJCNDbrekvHV"
  );

  const walletWrapper = new anchor.Wallet(myWallet);

  const provider = new anchor.Provider(connection, walletWrapper, {
    preflightCommitment: "recent",
  });
  const program = new anchor.Program(idl, programId, provider);

  const getCandyMachine = async (
    config: anchor.web3.PublicKey,
    uuid: string
  ) => {
    return await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(CANDY_MACHINE), config.toBuffer(), Buffer.from(uuid)],
      programId
    );
  };

  const getMetadata = async (
    mint: anchor.web3.PublicKey
  ): Promise<anchor.web3.PublicKey> => {
    return (
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0];
  };

  const getMasterEdition = async (
    mint: anchor.web3.PublicKey
  ): Promise<anchor.web3.PublicKey> => {
    return (
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
          Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0];
  };

  const findClaimStatusKey = async (
    index: number,
    distributor: PublicKey
  ): Promise<[PublicKey, number]> => {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from("ClaimStatus"),
        new anchor.BN(index).toArrayLike(Buffer, "le", 8),
        distributor.toBytes(),
      ],
      programId
    );
  };

  const createConfig = async function (
    that,
    retainAuthority: boolean,
    size: number
  ): Promise<TransactionInstruction> {
    that.authority = anchor.web3.Keypair.generate();
    that.uuid = anchor.web3.Keypair.generate().publicKey.toBase58().slice(0, 6);

    return await program.instruction.initializeConfig(
      {
        uuid: that.uuid,
        symbol: "PMV",
        isMutable: true,
        maxSupply: new anchor.BN(0),
        retain_autority: retainAuthority,
        uri: 'https://my-json-server.typicode.com/freddyaboulton/pmv-token/tokens/',
      },
      {
        accounts: {
          config: that.config.publicKey,
          authority: that.authority.publicKey,
          payer: myWallet.publicKey,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [myWallet, that.config],
      }
    );
  };
  const getTokenWallet = async function (wallet: PublicKey, mint: PublicKey) {
    return (
      await PublicKey.findProgramAddress(
        [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
      )
    )[0];
  };

  describe("sol only", function () {
    beforeEach(async function () {
      const config = await anchor.web3.Keypair.generate();
      this.config = config;
      const txInstr = await createConfig(this, false, 10);
      this.candyMachineUuid = anchor.web3.Keypair.generate()
        .publicKey.toBase58()
        .slice(0, 6);
      const [candyMachine, bump] = await getCandyMachine(
        this.config.publicKey,
        this.candyMachineUuid
      );

      try {
        const tx = await program.rpc.initializeCandyMachine(
          bump,
          {
            uuid: this.candyMachineUuid,
            price: new anchor.BN(0),
          },
          {
            accounts: {
              candyMachine,
              wallet: myWallet.publicKey,
              config: this.config.publicKey,
              authority: this.authority.publicKey,
              payer: myWallet.publicKey,
              systemProgram: anchor.web3.SystemProgram.programId,
              rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            },
            signers: [myWallet, this.authority, this.config],
            instructions: [
              anchor.web3.SystemProgram.createAccount({
                fromPubkey: myWallet.publicKey,
                newAccountPubkey: config.publicKey,
                space: configArrayStart + 4 + 4 + 2,
                lamports:
                  await provider.connection.getMinimumBalanceForRentExemption(
                    configArrayStart + 4 + 4 + 2
                  ),
                programId: programId,
              }),
              anchor.web3.SystemProgram.transfer({
                fromPubkey: myWallet.publicKey,
                toPubkey: this.authority.publicKey,
                lamports: 5,
              }),
              txInstr,
            ],
          }
        );
      } catch (e) {
        console.log(e);
        throw e;
      }
    });

    it("Is initialized!", async function () {
      // Add your test here.
      const [candyMachine, bump] = await getCandyMachine(
        this.config.publicKey,
        this.candyMachineUuid
      );

      const machine: CandyMachine = await program.account.candyMachine.fetch(
        candyMachine
      );
      assert.equal(machine.data.uuid, this.candyMachineUuid);
      assert.ok(machine.wallet.equals(myWallet.publicKey));
      assert.ok(machine.config.equals(this.config.publicKey));
      assert.ok(machine.authority.equals(this.authority.publicKey));
      console.log(machine.data.price)
      assert.equal(machine.bump, bump);
      assert.equal(machine.tokenMint, null);
    });

    it("mints 5x to account not authority", async function () {
      for (let i = 1; i < 6; i++) {
        const mint = anchor.web3.Keypair.generate();
        const token = await getTokenWallet(
          myWallet.publicKey,
          mint.publicKey
        );
        const metadata = await getMetadata(mint.publicKey);
        const masterEdition = await getMasterEdition(mint.publicKey);
        const [candyMachine, _] = await getCandyMachine(
          this.config.publicKey,
          this.candyMachineUuid
        );
        try {
          const [claimStatus, bump] = await findClaimStatusKey(i, candyMachine);
          const tx = await program.rpc.mintNft(
            new anchor.BN(bump),
            new anchor.BN(i),
            {
              accounts: {
                config: this.config.publicKey,
                candyMachine: candyMachine,
                claimStatus: claimStatus,
                payer: this.authority.publicKey,
                wallet: myWallet.publicKey,
                mint: mint.publicKey,
                metadata: metadata,
                masterEdition: masterEdition,
                mintAuthority: myWallet.publicKey,
                updateAuthority: myWallet.publicKey,
                tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
              },
              signers: [mint, this.authority],
              instructions: [
                // Give authority enough to pay off the cost of the nft!
                // it'll be funnneled right back
                anchor.web3.SystemProgram.transfer({
                  fromPubkey: myWallet.publicKey,
                  toPubkey: this.authority.publicKey,
                  lamports: 1000000000 + 10000000, // add minting fees in there
                }),
                anchor.web3.SystemProgram.createAccount({
                  fromPubkey: myWallet.publicKey,
                  newAccountPubkey: mint.publicKey,
                  space: MintLayout.span,
                  lamports:
                    await provider.connection.getMinimumBalanceForRentExemption(
                      MintLayout.span
                    ),
                  programId: TOKEN_PROGRAM_ID,
                }),
                Token.createInitMintInstruction(
                  TOKEN_PROGRAM_ID,
                  mint.publicKey,
                  0,
                  myWallet.publicKey,
                  myWallet.publicKey
                ),
                createAssociatedTokenAccountInstruction(
                  token,
                  myWallet.publicKey,
                  myWallet.publicKey,
                  mint.publicKey
                ),
                Token.createMintToInstruction(
                  TOKEN_PROGRAM_ID,
                  mint.publicKey,
                  token,
                  myWallet.publicKey,
                  [],
                  1
                ),
              ],
            });
          const [key] = await findClaimStatusKey(i, candyMachine);
          const status = await program.account.claimStatus.fetch(key);
          assert(status.isClaimed === true);
        } catch (e) {
          if (i != 5) {
            console.log("Failure at ", i, e);
            throw e;
          }
        }

        if (i != 5) {
          const metadataAccount = await connection.getAccountInfo(metadata);
          assert.ok(metadataAccount.data.length > 0);
          const masterEditionAccount = await connection.getAccountInfo(
            masterEdition
          );
          assert.ok(masterEditionAccount.data.length > 0);
        }
      }
    });

    it("Does not allow minting same index twice", async function () {
      const mint = anchor.web3.Keypair.generate();
      const token = await getTokenWallet(
        this.authority.publicKey,
        mint.publicKey
      );
      const metadata = await getMetadata(mint.publicKey);
      const masterEdition = await getMasterEdition(mint.publicKey);
      const [candyMachine, _] = await getCandyMachine(
        this.config.publicKey,
        this.candyMachineUuid
      );
      const [claimStatus, bump] = await findClaimStatusKey(6, candyMachine);
      const tx = await program.rpc.mintNft(
        new anchor.BN(bump),
        new anchor.BN(6),
        {
          accounts: {
            config: this.config.publicKey,
            candyMachine: candyMachine,
            claimStatus: claimStatus,
            payer: this.authority.publicKey,
            wallet: myWallet.publicKey,
            mint: mint.publicKey,
            metadata: metadata,
            masterEdition: masterEdition,
            mintAuthority: this.authority.publicKey,
            updateAuthority: this.authority.publicKey,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
          },
          signers: [mint, this.authority, myWallet],
          instructions: [
            anchor.web3.SystemProgram.transfer({
              fromPubkey: myWallet.publicKey,
              toPubkey: this.authority.publicKey,
              lamports: 1000000000 + 10000000, // add minting fees in there
            }),
            anchor.web3.SystemProgram.createAccount({
              fromPubkey: myWallet.publicKey,
              newAccountPubkey: mint.publicKey,
              space: MintLayout.span,
              lamports:
                await provider.connection.getMinimumBalanceForRentExemption(
                  MintLayout.span
                ),
              programId: TOKEN_PROGRAM_ID,
            }),
            Token.createInitMintInstruction(
              TOKEN_PROGRAM_ID,
              mint.publicKey,
              0,
              this.authority.publicKey,
              this.authority.publicKey
            ),
            createAssociatedTokenAccountInstruction(
              token,
              myWallet.publicKey,
              this.authority.publicKey,
              mint.publicKey
            ),
            Token.createMintToInstruction(
              TOKEN_PROGRAM_ID,
              mint.publicKey,
              token,
              this.authority.publicKey,
              [],
              1
            ),
          ],
        });
      try {
        const [claimStatus, bump] = await findClaimStatusKey(6, candyMachine);
        const tx = await program.rpc.mintNft(
          new anchor.BN(bump),
          new anchor.BN(6),
          {
            accounts: {
              config: this.config.publicKey,
              candyMachine: candyMachine,
              claimStatus: claimStatus,
              payer: this.authority.publicKey,
              wallet: myWallet.publicKey,
              mint: mint.publicKey,
              metadata: metadata,
              masterEdition: masterEdition,
              mintAuthority: this.authority.publicKey,
              updateAuthority: this.authority.publicKey,
              tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
              rent: anchor.web3.SYSVAR_RENT_PUBKEY,
              clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
            },
            signers: [mint, this.authority, myWallet],
            instructions: [
              anchor.web3.SystemProgram.transfer({
                fromPubkey: myWallet.publicKey,
                toPubkey: this.authority.publicKey,
                lamports: 1000000000 + 10000000, // add minting fees in there
              }),
              anchor.web3.SystemProgram.createAccount({
                fromPubkey: myWallet.publicKey,
                newAccountPubkey: mint.publicKey,
                space: MintLayout.span,
                lamports:
                  await provider.connection.getMinimumBalanceForRentExemption(
                    MintLayout.span
                  ),
                programId: TOKEN_PROGRAM_ID,
              }),
              Token.createInitMintInstruction(
                TOKEN_PROGRAM_ID,
                mint.publicKey,
                0,
                this.authority.publicKey,
                this.authority.publicKey
              ),
              createAssociatedTokenAccountInstruction(
                token,
                myWallet.publicKey,
                this.authority.publicKey,
                mint.publicKey
              ),
              Token.createMintToInstruction(
                TOKEN_PROGRAM_ID,
                mint.publicKey,
                token,
                this.authority.publicKey,
                [],
                1
              ),
            ],
          });
      } catch (e) {
        const err = e as SendTransactionError;
        expect(err.logs?.join(" ")).to.have.string(
          "already in use"
        );
      }
    });
  });
});


