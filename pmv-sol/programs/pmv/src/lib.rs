pub mod utils;

use {
    crate::utils::{assert_initialized, assert_owned_by, spl_token_transfer, TokenTransferParams},
    anchor_lang::{
        prelude::*, solana_program::system_program, AnchorDeserialize, AnchorSerialize,
        Discriminator, Key,
    },
    anchor_spl::token::Token,
    mpl_token_metadata::{
        instruction::{create_master_edition_v3, create_metadata_accounts_v2, update_metadata_accounts,
                      verify_collection},
        state::{MAX_CREATOR_LEN, MAX_CREATOR_LIMIT, MAX_SYMBOL_LENGTH, Collection},
    },
    spl_token::state::Mint,
};
anchor_lang::declare_id!("GoM4aT4mj3E5WZSA7SUBc3UPamxQLCnFXggNtBUw791K");

const PREFIX: &str = "candy_machine";
#[program]
pub mod nft_candy_machine {
    use anchor_lang::solana_program::{
        program::{invoke, invoke_signed},
        system_instruction,
    };

    use super::*;

    pub fn mint_nft<'info>(
        ctx: Context<'_, '_, '_, 'info, MintNFT<'info>>,
        _bump: u8,
        token_index: u64,
        eth_address: String,
        sol_address: String
    ) -> ProgramResult {
        let candy_machine = &mut ctx.accounts.candy_machine;
        let config = &ctx.accounts.config;
        let claim_status = &mut ctx.accounts.claim_status;

        if *ctx.accounts.payer.key != candy_machine.authority {
            return Err(ErrorCode::MustBeAuthority.into());
        }
      
        if let Some(mint) = candy_machine.token_mint {
            let token_account_info = &ctx.remaining_accounts[0];
            let transfer_authority_info = &ctx.remaining_accounts[1];
            let token_account: spl_token::state::Account = assert_initialized(&token_account_info)?;

            assert_owned_by(&token_account_info, &spl_token::id())?;

            if token_account.mint != mint {
                return Err(ErrorCode::MintMismatch.into());
            }

            if token_account.amount < candy_machine.data.price {
                return Err(ErrorCode::NotEnoughTokens.into());
            }

            spl_token_transfer(TokenTransferParams {
                source: token_account_info.clone(),
                destination: ctx.accounts.wallet.to_account_info(),
                authority: transfer_authority_info.clone(),
                authority_signer_seeds: &[],
                token_program: ctx.accounts.token_program.to_account_info(),
                amount: candy_machine.data.price,
            })?;
        } else {
            if ctx.accounts.payer.lamports() < candy_machine.data.price {
                return Err(ErrorCode::NotEnoughSOL.into());
            }
            invoke(
                &system_instruction::transfer(
                    &ctx.accounts.payer.key,
                    ctx.accounts.wallet.key,
                    candy_machine.data.price,
                ),
                &[
                    ctx.accounts.payer.to_account_info(),
                    ctx.accounts.wallet.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
        }

        candy_machine.items_redeemed = candy_machine
            .items_redeemed
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        let config_key = config.key();
        let authority_seeds = [
            PREFIX.as_bytes(),
            config_key.as_ref(),
            candy_machine.data.uuid.as_bytes(),
            &[candy_machine.bump],
        ];

        let creators: Vec<mpl_token_metadata::state::Creator> =
            vec![mpl_token_metadata::state::Creator {
                address: candy_machine.key(),
                verified: true,
                share: 100,
            }];

        let metadata_infos = vec![
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
            candy_machine.to_account_info(),
        ];

        let master_edition_infos = vec![
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
            candy_machine.to_account_info(),
        ];
        let collection = match candy_machine.collection {
            Some(pubkey) => Some(Collection {verified: false, key: pubkey}),
            _ => None
        };

        invoke_signed(
            &create_metadata_accounts_v2(
                *ctx.accounts.token_metadata_program.key,
                *ctx.accounts.metadata.key,
                *ctx.accounts.mint.key,
                *ctx.accounts.mint_authority.key,
                *ctx.accounts.payer.key,
                candy_machine.key(),
                format!("{} {}", config.data.symbol.clone(), token_index),
                config.data.symbol.clone(),
                format!("{}{}", config.data.uri.clone(), token_index),
                Some(creators),
                0,
                true,
                config.data.is_mutable,
                collection, // set collection here
                None
            ),
            metadata_infos.as_slice(),
            &[&authority_seeds],
        )?;
        invoke_signed(
            &create_master_edition_v3(
                *ctx.accounts.token_metadata_program.key,
                *ctx.accounts.master_edition.key,
                *ctx.accounts.mint.key,
                candy_machine.key(),
                *ctx.accounts.mint_authority.key,
                *ctx.accounts.metadata.key,
                *ctx.accounts.payer.key,
                //max supply
                Some(1),
            ),
            master_edition_infos.as_slice(),
            &[&authority_seeds],
        )?;

        let mut new_update_authority = Some(candy_machine.authority);

        if !ctx.accounts.config.data.retain_authority {
            new_update_authority = Some(ctx.accounts.update_authority.key());
        }
        invoke_signed(
            &update_metadata_accounts(
                *ctx.accounts.token_metadata_program.key,
                *ctx.accounts.metadata.key,
                candy_machine.key(),
                new_update_authority,
                None,
                Some(true),
            ),
            &[
                ctx.accounts.token_metadata_program.to_account_info(),
                ctx.accounts.metadata.to_account_info(),
                candy_machine.to_account_info(),
            ],
            &[&authority_seeds],
        )?;
        verify_collection(*ctx.accounts.token_metadata_program.key,
            metadata=Pubkey, collection_authority=*candy_machine.key(),
            payer=*ctx.accounts.payer.key,
            collection_mint=*candy_machine.collection,
            collection: Pubkey, collection_master_edition_account: Pubkey, collection_authority_record: Option<Pubkey>)
        claim_status.is_claimed = true;
        claim_status.sol_address = sol_address;
        claim_status.eth_address = eth_address;

        Ok(())
    }

    pub fn initialize_config(ctx: Context<InitializeConfig>, data: ConfigData) -> ProgramResult {
        let config_info = &mut ctx.accounts.config;
        if data.uuid.len() != 6 {
            return Err(ErrorCode::UuidMustBeExactly6Length.into());
        }

        let mut config = Config {
            data,
            authority: *ctx.accounts.authority.key,
        };

        let mut array_of_zeroes = vec![];
        while array_of_zeroes.len() < MAX_SYMBOL_LENGTH - config.data.symbol.len() {
            array_of_zeroes.push(0u8);
        }
        let new_symbol =
            config.data.symbol.clone() + std::str::from_utf8(&array_of_zeroes).unwrap();
        config.data.symbol = new_symbol;

        let mut new_data = Config::discriminator().try_to_vec().unwrap();
        new_data.append(&mut config.try_to_vec().unwrap());
        let mut data = config_info.data.borrow_mut();
        // god forgive me couldnt think of better way to deal with this
        for i in 0..new_data.len() {
            data[i] = new_data[i];
        }

        Ok(())
    }

    pub fn initialize_candy_machine(
        ctx: Context<InitializeCandyMachine>,
        bump: u8,
        data: CandyMachineData,
    ) -> ProgramResult {
        let candy_machine = &mut ctx.accounts.candy_machine;

        if data.uuid.len() != 6 {
            return Err(ErrorCode::UuidMustBeExactly6Length.into());
        }
        candy_machine.data = data;
        candy_machine.wallet = *ctx.accounts.wallet.key;
        candy_machine.authority = *ctx.accounts.authority.key;
        candy_machine.config = ctx.accounts.config.key();
        candy_machine.bump = bump;
        if ctx.remaining_accounts.len() > 0 {
            let token_mint_info = &ctx.remaining_accounts[0];
            let _token_mint: Mint = assert_initialized(&token_mint_info)?;
            let token_account: spl_token::state::Account =
                assert_initialized(&ctx.accounts.wallet)?;

            assert_owned_by(&token_mint_info, &spl_token::id())?;
            assert_owned_by(&ctx.accounts.wallet, &spl_token::id())?;

            if token_account.mint != *token_mint_info.key {
                return Err(ErrorCode::MintMismatch.into());
            }

            candy_machine.token_mint = Some(*token_mint_info.key);
        }

        Ok(())
    }

    pub fn create_collection_nft<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateCollectionNFT<'info>>
    ) -> ProgramResult {
        let candy_machine = &mut ctx.accounts.candy_machine;
        let config = &ctx.accounts.config;

        let config_key = config.key();
        let authority_seeds = [
            PREFIX.as_bytes(),
            config_key.as_ref(),
            candy_machine.data.uuid.as_bytes(),
            &[candy_machine.bump],
        ];

        let creators: Vec<mpl_token_metadata::state::Creator> =
            vec![mpl_token_metadata::state::Creator {
                address: candy_machine.key(),
                verified: true,
                share: 100,
            }];

        let metadata_infos = vec![
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
            candy_machine.to_account_info(),
        ];

        let master_edition_infos = vec![
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.mint_authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
            candy_machine.to_account_info(),
        ];
        invoke_signed(
            &create_metadata_accounts_v2(
                *ctx.accounts.token_metadata_program.key,
                *ctx.accounts.metadata.key,
                *ctx.accounts.mint.key,
                *ctx.accounts.mint_authority.key,
                *ctx.accounts.payer.key,
                candy_machine.key(),
                "Collection NFT".to_string(),
                config.data.symbol.clone(),
                " ".to_string(),
                Some(creators),
                0,
                true,
                false,
                None,
                None
            ),
            metadata_infos.as_slice(),
            &[&authority_seeds],
        )?;
        invoke_signed(
            &create_master_edition_v3(
                *ctx.accounts.token_metadata_program.key,
                *ctx.accounts.master_edition.key,
                *ctx.accounts.mint.key,
                candy_machine.key(),
                *ctx.accounts.mint_authority.key,
                *ctx.accounts.metadata.key,
                *ctx.accounts.payer.key,
                //max supply
                Some(0),
            ),
            master_edition_infos.as_slice(),
            &[&authority_seeds],
        )?;

        let mut new_update_authority = Some(candy_machine.authority);

        if !ctx.accounts.config.data.retain_authority {
            new_update_authority = Some(ctx.accounts.update_authority.key());
        }
        invoke_signed(
            &update_metadata_accounts(
                *ctx.accounts.token_metadata_program.key,
                *ctx.accounts.metadata.key,
                candy_machine.key(),
                new_update_authority,
                None,
                Some(true),
            ),
            &[
                ctx.accounts.token_metadata_program.to_account_info(),
                ctx.accounts.metadata.to_account_info(),
                candy_machine.to_account_info(),
            ],
            &[&authority_seeds],
        )?;
        candy_machine.collection = Some(*ctx.accounts.mint.key);

        Ok(())
    }

    pub fn update_authority(
        ctx: Context<UpdateCandyMachine>,
        new_authority: Option<Pubkey>,
    ) -> ProgramResult {
        let candy_machine = &mut ctx.accounts.candy_machine;

        if let Some(new_auth) = new_authority {
            candy_machine.authority = new_auth;
        }

        Ok(())
    }

    pub fn withdraw_funds<'info>(ctx: Context<WithdrawFunds<'info>>) -> ProgramResult {
        let authority = &ctx.accounts.authority;
        let pay = &ctx.accounts.config.to_account_info();
        let snapshot: u64 = pay.lamports();

        **pay.lamports.borrow_mut() = 0;

        **authority.lamports.borrow_mut() = authority
            .lamports()
            .checked_add(snapshot)
            .ok_or(ErrorCode::NumericalOverflowError)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(bump: u8, data: CandyMachineData)]
pub struct InitializeCandyMachine<'info> {
    #[account(init, seeds=[PREFIX.as_bytes(), config.key().as_ref(), data.uuid.as_bytes()], payer=payer, bump=bump, space=8+32+32+33+32+64+64+64+200)]
    candy_machine: ProgramAccount<'info, CandyMachine>,
    #[account(constraint= wallet.owner == &spl_token::id() || (wallet.data_is_empty() && wallet.lamports() > 0) )]
    wallet: AccountInfo<'info>,
    #[account(has_one=authority)]
    config: ProgramAccount<'info, Config>,
    #[account(signer, constraint= authority.data_is_empty() && authority.lamports() > 0)]
    authority: AccountInfo<'info>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(data: ConfigData)]
pub struct InitializeConfig<'info> {
    #[account(mut, constraint= config.to_account_info().owner == program_id && config.to_account_info().data_len() >= CONFIG_ARRAY_START+4 + 4)]
    config: AccountInfo<'info>,
    #[account(constraint= authority.data_is_empty() && authority.lamports() > 0 )]
    authority: AccountInfo<'info>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(mut, has_one = authority)]
    config: Account<'info, Config>,
    #[account(signer, address = config.authority)]
    authority: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(_bump: u8, token_index: u64)]
pub struct MintNFT<'info> {
    config: Account<'info, Config>,
    #[account(
        mut,
        has_one = config,
        has_one = wallet,
        seeds = [PREFIX.as_bytes(), config.key().as_ref(), candy_machine.data.uuid.as_bytes()],
        bump = candy_machine.bump,
    )]
    candy_machine: Account<'info, CandyMachine>,
    #[account(
        init,
        seeds = [
            b"ClaimStatus".as_ref(),
            token_index.to_le_bytes().as_ref(),
            candy_machine.key().to_bytes().as_ref()
        ],
        space = 200,
        bump = _bump,
        payer = payer
    )]
    pub claim_status: Account<'info, ClaimStatus>,
    #[account(mut)]
    payer: Signer<'info>,
    #[account(mut)]
    wallet: UncheckedAccount<'info>,
    // With the following accounts we aren't using anchor macros because they are CPI'd
    // through to token-metadata which will do all the validations we need on them.
    #[account(mut)]
    metadata: UncheckedAccount<'info>,
    #[account(mut)]
    mint: UncheckedAccount<'info>,
    mint_authority: Signer<'info>,
    update_authority: Signer<'info>,
    #[account(mut)]
    master_edition: UncheckedAccount<'info>,
    #[account(address = mpl_token_metadata::id())]
    token_metadata_program: UncheckedAccount<'info>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct CreateCollectionNFT<'info> {
    config: Account<'info, Config>,
    #[account(
        mut,
        has_one = config,
        has_one = wallet,
        seeds = [PREFIX.as_bytes(), config.key().as_ref(), candy_machine.data.uuid.as_bytes()],
        bump = candy_machine.bump,
    )]
    candy_machine: Account<'info, CandyMachine>,
    #[account(mut)]
    payer: Signer<'info>,
    #[account(mut)]
    wallet: UncheckedAccount<'info>,
    // With the following accounts we aren't using anchor macros because they are CPI'd
    // through to token-metadata which will do all the validations we need on them.
    #[account(mut)]
    metadata: UncheckedAccount<'info>,
    #[account(mut)]
    mint: UncheckedAccount<'info>,
    mint_authority: Signer<'info>,
    update_authority: Signer<'info>,
    #[account(mut)]
    master_edition: UncheckedAccount<'info>,
    #[account(address = mpl_token_metadata::id())]
    token_metadata_program: UncheckedAccount<'info>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct UpdateCandyMachine<'info> {
    #[account(
        mut,
        has_one = authority,
        seeds = [PREFIX.as_bytes(), candy_machine.config.key().as_ref(), candy_machine.data.uuid.as_bytes()],
        bump = candy_machine.bump
    )]
    candy_machine: ProgramAccount<'info, CandyMachine>,
    #[account(signer)]
    authority: AccountInfo<'info>,
}

#[account]
#[derive(Default)]
pub struct ClaimStatus {
    /// If true, the tokens have been claimed.
    pub is_claimed: bool,
    pub sol_address: String,
    pub eth_address: String
}

#[account]
#[derive(Default)]
pub struct CandyMachine {
    pub authority: Pubkey,
    pub wallet: Pubkey,
    pub token_mint: Option<Pubkey>,
    pub collection: Option<Pubkey>,
    pub config: Pubkey,
    pub data: CandyMachineData,
    pub items_redeemed: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct CandyMachineData {
    pub uuid: String,
    pub price: u64,
}

pub const CONFIG_ARRAY_START: usize = 32 + // authority
4 + 6 + // uuid + u32 len
4 + MAX_SYMBOL_LENGTH + // u32 len + symbol
2 + // seller fee basis points
1 + 4 + MAX_CREATOR_LIMIT*MAX_CREATOR_LEN + // optional + u32 len + actual vec
8 + //max supply
1 + // is mutable
1 + // retain authority
4; // max number of lines;

#[account]
#[derive(Default)]
pub struct Config {
    pub authority: Pubkey,
    pub data: ConfigData,
    // there's a borsh vec u32 denoting how many actual lines of data there are currently (eventually equals max number of lines)
    // There is actually lines and lines of data after this but we explicitly never want them deserialized.
    // here there is a borsh vec u32 indicating number of bytes in bitmask array.
    // here there is a number of bytes equal to ceil(max_number_of_lines/8) and it is a bit mask used to figure out when to increment borsh vec u32
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct ConfigData {
    pub uuid: String,
    /// The symbol for the asset
    pub symbol: String,
    pub is_mutable: bool,
    pub retain_authority: bool,
    pub uri: String,
}

#[error]
pub enum ErrorCode {
    #[msg("Account does not have correct owner!")]
    IncorrectOwner,
    #[msg("Account is not initialized!")]
    Uninitialized,
    #[msg("Mint Mismatch!")]
    MintMismatch,
    #[msg("Index greater than length!")]
    IndexGreaterThanLength,
    #[msg("Config must have atleast one entry!")]
    ConfigMustHaveAtleastOneEntry,
    #[msg("Numerical overflow error!")]
    NumericalOverflowError,
    #[msg("Can only provide up to 4 creators to candy machine (because candy machine is one)!")]
    TooManyCreators,
    #[msg("Uuid must be exactly of 6 length")]
    UuidMustBeExactly6Length,
    #[msg("Not enough tokens to pay for this minting")]
    NotEnoughTokens,
    #[msg("Not enough SOL to pay for this minting")]
    NotEnoughSOL,
    #[msg("Token transfer failed")]
    TokenTransferFailed,
    #[msg("Candy machine is empty!")]
    CandyMachineEmpty,
    #[msg("Candy machine is not live yet!")]
    CandyMachineNotLiveYet,
    #[msg("Number of config lines must be at least number of items available")]
    ConfigLineMismatch,
    #[msg("Must be authority to mint")]
    MustBeAuthority,
}
