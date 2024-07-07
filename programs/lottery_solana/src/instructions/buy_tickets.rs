use anchor_lang::prelude::*;
use crate::{
    state::Game,
    state::Ticket,
    error::ErrorCode,
    TICKET_PRICE,
    _has_game_ended};

pub fn _buy_ticket(ctx: Context<BuyTicket>) -> Result<()> {

    let player = &ctx.accounts.player;
    let game   = &mut ctx.accounts.game;
    let ticket = &mut ctx.accounts.ticket;

    // Check if the game has ended, players cannot buy tickets after the game ends
    require!(_has_game_ended(game) == false, ErrorCode::GameEnded);

    // Check if the player has enough SOL to buy the tickets
    require!(player.lamports() >= TICKET_PRICE, ErrorCode::InsufficientTicketFunds);

    // Transfer the SOL to the game account
    let txn = anchor_lang::solana_program::system_instruction::transfer(
        &player.key(),
        &game.key(),
        TICKET_PRICE,
    );
    anchor_lang::solana_program::program::invoke(
        &txn,
        &[
            player.to_account_info(),
            game.to_account_info(),
            ctx.accounts.system_program.to_account_info()
        ]
    )?;

    // Create a new ticket for the player
    let new_ticket_id = game.total_tickets;
    ticket.id = new_ticket_id;
    ticket.owner = player.key();

    // Update the total amount of SOL and tickets in the game
    game.prize_pool += TICKET_PRICE;
    game.total_tickets += 1;

    Ok(())
}

#[derive(Accounts)]
pub struct BuyTicket<'info> {
    #[account(
        init, 
        seeds = [
            &game.total_tickets.to_be_bytes(),
            game.key().as_ref()
        ], 
        constraint = player.to_account_info().lamports() >= TICKET_PRICE,
        bump, 
        payer = player, 
        space = 32 + 4 + 8,
    )]
    pub ticket: Account<'info, Ticket>,
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub system_program: Program<'info, System>
}
