import { createRequire } from "module";
const require = createRequire(import.meta.url);

const anchor = require('@project-serum/anchor');
import {
    PublicKey,
    SYSVAR_RENT_PUBKEY,
    SystemProgram,
    TransactionInstruction,
} from "@solana/web3.js";
import {
    TOKEN_METADATA_PROGRAM_ID, TOKEN_PROGRAM_ID, SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    CANDY_MACHINE, CONFIG_ARRAY_START, CONFIG, AUTHORITY, UUID
} from "./constants.js";



const connection = new anchor.web3.Connection(
    "https://api.devnet.solana.com/",
    "recent"
);

export const myWallet = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(
        JSON.parse(require("fs").readFileSync(process.env.MY_WALLET, "utf8"))
    )
);

const walletWrapper = new anchor.Wallet(myWallet);

export const provider = new anchor.Provider(connection, walletWrapper, {
    preflightCommitment: "recent",
});

// Address of the deployed program.
const programId = new anchor.web3.PublicKey(
    "2MvgrbsWoramiYaBBE9pqhXcg72ByZvbMJCNDbrekvHV"
);

const idl = JSON.parse(
    require("fs").readFileSync("../target/idl/nft_candy_machine.json", "utf8")
);

export const program = new anchor.Program(idl, programId, provider);

export const getCandyMachine = async (
    config,
    uuid
) => {
    return await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(CANDY_MACHINE), config.toBuffer(), Buffer.from(uuid)],
        programId
    );
};

export const getMetadata = async (
    mint
) => {
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

export const getMasterEdition = async (
    mint
) => {
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

export const findClaimStatusKey = async (
    index,
    distributor
) => {
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
    config,
    authority,
    uuid,
    retainAuthority,
    size,
) {


    return await program.instruction.initializeConfig(
        {
            uuid: uuid,
            symbol: "PMV",
            isMutable: true,
            maxSupply: new anchor.BN(0),
            retain_autority: retainAuthority,
            uri: 'https://my-json-server.typicode.com/freddyaboulton/pmv-token/tokens/',
        },
        {
            accounts: {
                config: config.publicKey,
                authority: authority.publicKey,
                payer: myWallet.publicKey,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            },
            signers: [myWallet, config],
        }
    );
};

export const getTokenWallet = async function (wallet, mint) {
    return (
        await PublicKey.findProgramAddress(
            [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
        )
    )[0];
};

export function createAssociatedTokenAccountInstruction(
    associatedTokenAddress,
    payer,
    walletAddress,
    splTokenMintAddress
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

export async function initialize() {
    const txInstr = await createConfig(CONFIG, AUTHORITY, UUID, false, 10);
    const [candyMachine, bump] = await getCandyMachine(
        CONFIG.publicKey,
        UUID
    );

    const tx = await program.rpc.initializeCandyMachine(
        bump,
        {
            uuid: UUID,
            price: new anchor.BN(0),
        },
        {
            accounts: {
                candyMachine,
                wallet: myWallet.publicKey,
                config: CONFIG.publicKey,
                authority: AUTHORITY.publicKey,
                payer: myWallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            },
            signers: [myWallet, AUTHORITY, CONFIG],
            instructions: [
                anchor.web3.SystemProgram.createAccount({
                    fromPubkey: myWallet.publicKey,
                    newAccountPubkey: CONFIG.publicKey,
                    space: CONFIG_ARRAY_START + 4 + 4 + 2,
                    lamports:
                        await provider.connection.getMinimumBalanceForRentExemption(
                            CONFIG_ARRAY_START + 4 + 4 + 2
                        ),
                    programId: programId,
                }),
                anchor.web3.SystemProgram.transfer({
                    fromPubkey: myWallet.publicKey,
                    toPubkey: AUTHORITY.publicKey,
                    lamports: 5,
                }),
                txInstr,
            ],
        }
    );
}