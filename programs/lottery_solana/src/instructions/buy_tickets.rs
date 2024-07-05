use anchor_lang::prelude::*;
use crate::state::Game;

pub fn _buy_tickets(_ctx: Context<BuyTickets>, _num_of_tickets: u32) -> Result<()> {
    // TBD
    Ok(())
}

#[derive(Accounts)]
pub struct BuyTickets<'info> {
    #[account(mut)]
    game: Account<'info, Game>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>
}
