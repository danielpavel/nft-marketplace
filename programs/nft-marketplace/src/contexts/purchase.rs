use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Purchase<'info> {
    #[account(mut)]
    buyer: Signer<'info>,
    // TODO: Implement this.
}

impl<'info> Purchase<'info> {
    pub fn purchase(&mut self) -> Result<()> {
        // TODO: Implement this.
        Ok(())
    }

    pub fn close_vault(&mut self) -> Result<()> {
        // TODO: Implement this.
        Ok(())
    }
}
