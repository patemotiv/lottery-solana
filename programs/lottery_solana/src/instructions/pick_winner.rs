use anchor_lang::prelude::*;
use crate::{
    state::Game,
    state::Ticket,
    error::ErrorCode,
    _has_game_ended,
};

pub fn _pick_winner(ctx: Context<PickWinner>) -> Result<()> {

    let game = &mut ctx.accounts.game;

    // Check if the game is over
    require!(_has_game_ended(game), ErrorCode::GameNotEnded);

    // Check if winner has already been picked
    require!(game.winner == None, ErrorCode::WinnerAlreadyPicked);

    // Check if there are enough participants
    require!(game.total_tickets > 0, ErrorCode::NotEnoughParticipants);

    // Generate a "random" number based on a hash
    let hash = Clock::get()?.unix_timestamp;
    let winning_ticket_id = hash % game.total_tickets as i64;

    // Now find the Ticket PDA that has the winning ticket id
    // A ticket PDA is created with the game account and the ticket id as seeds
    // The ticket PDA is created in the buy_ticket instruction
    let (winning_ticket_pda, _bump) = Pubkey::find_program_address(
        &[game.key().as_ref(), winning_ticket_id.to_ne_bytes().as_ref()],
        &ctx.program_id
    );
    msg!("winning_ticket_pda: {:?}", winning_ticket_pda);

    // Get the account info for the winning ticket PDA
    let winning_ticket_account_info = ctx.remaining_accounts.iter().find(
        |account_info| {
            account_info.key == &winning_ticket_pda
        }
    ).ok_or(ProgramError::InvalidAccountData)?;

    // Now find the player who owns the winning ticket
    let winning_ticket = Ticket::try_from_slice(&winning_ticket_account_info.data.borrow())?;

    // Set the winner of the game
    msg!("winner: {:?}", winning_ticket.owner);
    game.winner = Some(winning_ticket.owner);

    Ok(())
}

#[derive(Accounts)]
pub struct PickWinner<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub system_program: Program<'info, System>,
}
