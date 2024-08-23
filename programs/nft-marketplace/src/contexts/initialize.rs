use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface};

use crate::errors::MarketplaceErrorCode;
use crate::state::Marketplace;

#[derive(Accounts)]
#[instruction(name: String)]
pub struct Initialize<'info> {
    #[account(mut)]
    admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = Marketplace::INIT_SPACE,
        seeds = [b"marketplace".as_ref(), name.as_str().as_bytes()],
        bump,
    )]
    marketplace: Account<'info, Marketplace>,

    #[account(
        init,
        payer = admin,
        mint::authority = marketplace,
        mint::decimals = 6,
        mint::token_program = token_program,
        seeds = [b"rewards", marketplace.key().as_ref()],
        bump
    )]
    rewards_mint: InterfaceAccount<'info, Mint>,

    system_program: Program<'info, System>,
    token_program: Interface<'info, TokenInterface>,
}

impl<'info> Initialize<'info> {
    pub fn init(&mut self, name: String, fee: u16, bumps: &InitializeBumps) -> Result<()> {
        require!(
            name.len() > 0 && name.len() < 33,
            MarketplaceErrorCode::MarketplaceNameTooLong
        );

        self.marketplace.set_inner(Marketplace {
            admin: self.admin.key(),
            fee,
            name,
            bump: bumps.marketplace,
            rewards_bumps: bumps.rewards_mint,
        });

        Ok(())
    }
}
