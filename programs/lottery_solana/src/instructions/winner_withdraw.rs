use anchor_lang::{prelude::*, solana_program::native_token::LAMPORTS_PER_SOL};
use crate::{
    state::Game,
    error::ErrorCode,
    _has_game_ended,
    GAME_FEE,
};

pub fn _winner_withdraw(ctx: Context<WinnerWithdraw>) -> Result<()> {
    
    let game = &mut ctx.accounts.game;
    let winner = &ctx.accounts.winner;
    let owner = &ctx.accounts.owner;

    msg!("game: {:?}", game.key());
    msg!("game.owner: {:?}", game.owner);
    msg!("game.winner: {:?}", game.winner);
    msg!("winner.key: {:?}", winner.key());
    msg!("owner.key: {:?}", owner.key());

    require!(_has_game_ended(game), ErrorCode::GameNotEnded);
    require!(game.owner == owner.key(), ErrorCode::Unauthorized);
    require!(game.winner == Some(winner.key()), ErrorCode::Unauthorized);
    require!(game.winner_withdrawn == false, ErrorCode::WinnerAlreadyWithdrawn);

    // Calculate the amount to be sent to the winner
    let amount_to_winner = (game.prize_pool as f64 * (1.0 - GAME_FEE) as f64) as u64;
    let amount_as_fee = game.prize_pool - amount_to_winner;

    msg!("amount_to_winner: {:?} SOL", amount_to_winner as f64 / LAMPORTS_PER_SOL as f64);
    msg!("amount_as_fee: {:?} SOL", amount_as_fee as f64 / LAMPORTS_PER_SOL as f64);

    // Transfer the amount to the winner
    **game.to_account_info().try_borrow_mut_lamports()? -= amount_to_winner;
    **winner.to_account_info().try_borrow_mut_lamports()? += amount_to_winner;

    // Reset the game
    game.winner_withdrawn = true;

    // Check if the game account has enough lamports to pay rent
    let rent = Rent::get()?.minimum_balance(game.to_account_info().data_len());
    msg!("rent for game: {:?} SOL", rent as f64 / LAMPORTS_PER_SOL as f64);

    // Check if there are sufficient funds in the bank account
    require!( **game.to_account_info().lamports.borrow() - rent >= amount_as_fee,
                ErrorCode::InsufficientGameFunds );

    // Transfer the fee to the owner
    **game.to_account_info().try_borrow_mut_lamports()? -= amount_as_fee;
    **owner.to_account_info().try_borrow_mut_lamports()? += amount_as_fee;

    Ok(())
}

#[derive(Accounts)]
pub struct WinnerWithdraw<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub winner: Signer<'info>,
    #[account(mut)]
    /// CHECK: Pass the owner account to get fee
    pub owner: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
