use anchor_lang::prelude::*;
use crate::{
    state::Game,
    GAME_ACCOUNT_SEED,
};

pub fn _create_game(_ctx: Context<CreateGame>, _end_time: i64) -> Result<()> {
    // TBD
    Ok(())
}

#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 8 + 8 + 4 + 4 + 8 + 1 + 1 + 8,
        seeds = [GAME_ACCOUNT_SEED.as_bytes(), creator.key().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>
}
