use anchor_lang::prelude::*;
use std::mem::size_of;
use crate::{
    state::Game,
    state::Creator,
    GAME_ACCOUNT_SEED,
    CREATOR_ACCOUNT_SEED,
    error::ErrorCode,
    _is_end_time_valid
};

pub fn _initialize_creator(ctx: Context<InitializeCreator>) -> Result<()> {
    let creator_acc = &mut ctx.accounts.creator_acc;
    creator_acc.creator = ctx.accounts.creator.key();
    creator_acc.game_count = 0;
    Ok(())
}

pub fn _create_game(ctx: Context<CreateGame>, end_time: i64) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let creator_acc: &mut Creator = &mut ctx.accounts.creator_acc;
    let creator = &ctx.accounts.creator;

    require!(creator_acc.creator == creator.key(), ErrorCode::Unauthorized);
    require!(_is_end_time_valid(end_time) == true, ErrorCode::InvalidGameEndTime);

    // Initialize Game account fields
    game.creator = creator.key();
    game.end_time = end_time;
    game.prize_pool = 0; // Start with an empty prize pool
    game.total_tickets = 0; // No tickets sold initially
    game.winner_ticket = None;
    game.winner_withdrawn = false;

    // Increment the game count for the creator
    creator_acc.game_count += 1;

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeCreator<'info> {
    #[account(
        init,
        payer = creator,
        space = size_of::<Creator>() + 8,
        seeds = [
            CREATOR_ACCOUNT_SEED.as_bytes(),
            creator.key().as_ref()
        ],
        bump
    )]
    pub creator_acc: Account<'info, Creator>,

    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateGame<'info> {
    #[account(
        init,
        payer = creator,
        space = size_of::<Game>() + 8,
        seeds = [
            GAME_ACCOUNT_SEED.as_bytes(),
            creator.key().as_ref(),
            &creator_acc.game_count.to_be_bytes()
        ],
        bump
    )]
    pub game: Account<'info, Game>,

    #[account(
        mut,
        constraint = creator_acc.creator == creator.key()
    )]
    pub creator_acc: Account<'info, Creator>,

    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>
}
