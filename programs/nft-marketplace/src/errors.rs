use anchor_lang::error_code;

#[error_code]
pub enum MarketplaceErrorCode {
    #[msg("Marketplace name too long")]
    MarketplaceNameTooLong,
}
