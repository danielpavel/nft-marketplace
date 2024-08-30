use anchor_lang::prelude::*;
use solana_program::system_instruction;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::Metadata,
    token::Token,
    token_interface::{
        close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TransferChecked,
    },
};

use crate::state::{Listing, Marketplace};

#[derive(Accounts)]
pub struct Purchase<'info> {
    #[account(mut)]
    taker: Signer<'info>,

    #[account(
        mut,
    )]
    /// CHECK: I dunno why Anchor is complaining about this one.
    /// I added the address field to the account attribute.
    maker: SystemAccount<'info>,

    #[account(
        address = listing.mint
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = maker,
    )]
    maker_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = mint,
        associated_token::authority = taker,
    )]
    taker_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        close = maker,
        has_one = maker,
        has_one = mint,
        seeds = [b"listing", marketplace.key().as_ref(), listing.mint.key().as_ref()],
        bump = listing.bump
    )]
    listing: Box<Account<'info, Listing>>,

    #[account(
        mut,
        seeds = [b"marketplace".as_ref(), marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump
    )]
    marketplace: Account<'info, Marketplace>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"treasury", marketplace.key().as_ref()],
        bump,
    )]
    pub treasury: SystemAccount<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub metadata_program: Program<'info, Metadata>,
}

impl<'info> Purchase<'info> {
    pub fn purchase(&mut self) -> Result<()> {

        let amount_to_treasury = self.listing.price
            .checked_mul(self.marketplace.fee as u64).ok_or(ProgramError::ArithmeticOverflow)?
            .checked_div(10000).ok_or(ProgramError::ArithmeticOverflow)?;

        // Transfer the amount to the treasury.
        self.transfer_sol(
            &self.taker.to_account_info(), 
            &self.treasury.to_account_info(), 
            amount_to_treasury
        )?;

        let amount_to_maker = self.listing.price
            .checked_sub(amount_to_treasury)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        // Transfer the remaining amount to the maker.
        self.transfer_sol(
            &self.taker.to_account_info(), 
            &self.maker.to_account_info(), 
            amount_to_maker
        )?;

        // Transfer the NFT to the taker and close vault and listing account.
        self.withdraw_nft_and_close()
    }

    fn transfer_sol(& self, from: &AccountInfo<'info>, to: &AccountInfo<'info>, amount: u64) -> Result<()> {
        // Create the transfer instruction
        let transfer_instruction = system_instruction::transfer(from.key, to.key, amount);

        // Invoke the transfer instruction
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                from.to_account_info(),
                to.to_account_info(),
                self.system_program.to_account_info(),
            ],
        )?;

        Ok(())
    }

    pub fn withdraw_nft_and_close(&mut self) -> Result<()> {
        let bump = [self.listing.bump];
        let signer_seeds = [&[
            b"listing",
            self.marketplace.to_account_info().key.as_ref(),
            self.mint.to_account_info().key.as_ref(),
            &bump
        ][..]];

        let accounts = TransferChecked {
            from: self.vault.to_account_info(),
            to: self.taker_ata.to_account_info(),
            mint: self.mint.to_account_info(),
            authority: self.listing.to_account_info(),
        };

        let cpi_context = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            accounts,
            &signer_seeds,
        );

        transfer_checked(cpi_context, 1, self.mint.decimals)?;

        // Close the vault account
        let accounts = CloseAccount {
            account: self.vault.to_account_info(),
            destination: self.maker.to_account_info(),
            authority: self.listing.to_account_info(),
        };

        let ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            accounts,
            &signer_seeds,
        );

        close_account(ctx)
    }
}
