use anchor_lang::prelude::*;
use crate::{
    state::Game,
    error::ErrorCode,
    TICKET_ACCOUNT_SEED,
    _has_game_ended,
};

pub fn _pick_winner(ctx: Context<PickWinner>) -> Result<()> {

    let game = &mut ctx.accounts.game;

    // Check if the game is over
    require!(_has_game_ended(game), ErrorCode::GameNotEnded);

    // Check if winner has already been picked
    require!(game.winner_ticket == None, ErrorCode::WinnerAlreadyPicked);

    // Check if there are enough participants
    require!(game.total_tickets > 0, ErrorCode::NotEnoughParticipants);

    // Generate a "random" number based on a hash
    let hash = Clock::get()?.unix_timestamp;
    let winning_ticket_id = (hash % game.total_tickets as i64) as u32;

    // Now find the Ticket PDA that has the winning ticket id
    // A ticket PDA is created with the game account and the ticket id as seeds
    // The ticket PDA is created in the buy_ticket instruction
    let (winning_ticket_pda, _bump) = Pubkey::find_program_address(
        &[TICKET_ACCOUNT_SEED.as_bytes(), game.key().as_ref(), winning_ticket_id.to_be_bytes().as_ref()],
        &ctx.program_id
    );

    msg!("winning_ticket_pda: {:?}", winning_ticket_pda);

    // Save the winning ticket of the game
    game.winner_ticket = Some(winning_ticket_pda);

    Ok(())
}

#[derive(Accounts)]
pub struct PickWinner<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub system_program: Program<'info, System>,
}
