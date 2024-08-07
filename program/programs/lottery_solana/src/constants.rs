use anchor_lang::{prelude::*, solana_program::native_token::LAMPORTS_PER_SOL};

#[constant]
pub const TICKET_PRICE: u64 = LAMPORTS_PER_SOL; // 1 SOL
pub const GAME_FEE: f64 = 0.1;  // 10% game fee

// Seeds for creating accounts
pub const GAME_ACCOUNT_SEED: &str = "game_account";
pub const TICKET_ACCOUNT_SEED: &str = "ticket_account";
pub const CREATOR_ACCOUNT_SEED: &str = "creator_account";
pub const PLAYER_ACCOUNT_SEED: &str = "player_account";
