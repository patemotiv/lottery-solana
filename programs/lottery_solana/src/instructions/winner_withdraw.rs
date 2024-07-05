use anchor_lang::prelude::*;
use crate::state::Game;

pub fn _winner_withdraw(_ctx: Context<WinnerWithdraw>) -> Result<()> {
    // TBD
    Ok(())
}

#[derive(Accounts)]
pub struct WinnerWithdraw<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub winner: Signer<'info>,
    #[account(mut)]
    /// CHECK: Pass the owner account to get fee
    pub owner: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
