use anchor_lang::prelude::*;

declare_id!("5HfaVk6UZTkPKfLYQy2d9vVCC4HFbVgQapTuUwe6WnYZ");

pub mod contexts;
pub mod errors;
pub mod state;

pub use contexts::*;

#[program]
pub mod nft_marketplace {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, name: String, fee: u16) -> Result<()> {
        ctx.accounts.init(name, fee, &ctx.bumps)
    }

    pub fn list(ctx: Context<List>, price: u64) -> Result<()> {
        ctx.accounts.create_listing(price, &ctx.bumps)?;
        ctx.accounts.transfer_to_vault()
    }

    pub fn delist(ctx: Context<Delist>) -> Result<()> {
        ctx.accounts.withdraw_nft_and_close()
    }

    pub fn purchase(ctx: Context<Purchase>) -> Result<()> {
        ctx.accounts.purchase()
    }

}
