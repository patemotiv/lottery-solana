use anchor_lang::prelude::*;
use crate::{
    state::Game,
    GAME_ACCOUNT_SEED,
    error::ErrorCode,
    is_end_time_valid
};

pub fn _create_game(ctx: Context<CreateGame>, end_time: i64) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let creator = &ctx.accounts.creator;

    require!(is_end_time_valid(end_time) == true, ErrorCode::InvalidGameEndTime);

    // Initialize Game account fields
    game.creator = creator.key();
    game.end_time = end_time;
    game.prize_pool = 0; // Start with an empty prize pool
    game.total_tickets = 0; // No tickets sold initially
    game.winner = None;
    game.winner_withdrawn = false;

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
