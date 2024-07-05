use anchor_lang::prelude::*;
use crate::state::Game;

pub fn _pick_winner(_ctx: Context<PickWinner>) -> Result<()> {
    // TBD
    Ok(())
}

#[derive(Accounts)]
pub struct PickWinner<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub system_program: Program<'info, System>,
}
