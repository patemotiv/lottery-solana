use anchor_lang::prelude::*;

#[account]
pub struct Game {
    pub owner: Pubkey, // 32
    pub end_time: i64,  // 8
    pub prize_pool: u64, // 8
    pub total_tickets: u32, // 4
    pub winner: Option<Pubkey>, // 1 + 32
    pub winner_withdrawn: bool, // 1
}

#[account]
pub struct Ticket {
    pub owner: Pubkey,  // 32
    pub id: u32, // 4
}

#[account]
pub struct Player {
    pub player: Pubkey, // 32
    pub amount: u64, // 8
    pub ticket_count: u32, // 4
}

// Helper function to check if the game has ended
pub fn _has_game_ended(game: &Game) -> bool {
    let clock = Clock::get().unwrap();
    (game.end_time == 0) || (clock.unix_timestamp >= game.end_time)
}
