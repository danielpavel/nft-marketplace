use anchor_lang::prelude::*;

declare_id!("5HfaVk6UZTkPKfLYQy2d9vVCC4HFbVgQapTuUwe6WnYZ");

#[program]
pub mod nft_marketplace {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
