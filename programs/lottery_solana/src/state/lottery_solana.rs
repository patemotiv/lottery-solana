use anchor_lang::prelude::*;

#[account]
pub struct Game {
    pub owner: Pubkey,
    pub end_time: i64,
    pub prize_pool: u64,
    pub total_tickets: u32,
    pub winner: Option<Pubkey>,
    pub winner_withdrawn: bool,
}

#[account]
pub struct Ticket {
    pub owner: Pubkey,
    pub id: u32,
}

// Helper function to check if the game has ended
pub fn _has_game_ended(game: &Game) -> bool {
    let clock = Clock::get().unwrap();
    (game.end_time == 0) || (clock.unix_timestamp >= game.end_time)
}
