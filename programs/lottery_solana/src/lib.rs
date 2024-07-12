use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("HsKw5odRfszH8rUUU5RYzxBS3KwSG3Yiy3BxX67GcJb2");

#[program]
pub mod lottery_solana {
    use super::*;

    pub fn initialize_creator(ctx: Context<InitializeCreator>) -> Result<()> {
        _initialize_creator(ctx)
    }

    pub fn create_game(ctx: Context<CreateGame>, end_time: i64) -> Result<()> {
        _create_game(ctx, end_time)
    }

    pub fn buy_ticket(ctx: Context<BuyTicket>) -> Result<()> {
        _buy_ticket(ctx)
    }

    pub fn pick_winner(ctx: Context<PickWinner>) -> Result<()> {
        _pick_winner(ctx)
    }

    pub fn winner_withdraw(ctx: Context<WinnerWithdraw>) -> Result<()> {
        _winner_withdraw(ctx)
    }

    pub fn reset_game(ctx: Context<ResetGame>) -> Result<()> {
        _reset_game(ctx)
    }
}
