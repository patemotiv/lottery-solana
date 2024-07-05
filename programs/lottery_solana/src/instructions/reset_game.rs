use anchor_lang::prelude::*;
use crate::state::Game;

// Reset the game
pub fn _reset_game(_ctx: Context<ResetGame>) -> Result<()> {
    // TBD
    Ok(())
}

#[derive(Accounts)]
pub struct ResetGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}
