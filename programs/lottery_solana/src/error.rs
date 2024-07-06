use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("End time must be in the future.")]
    InvalidGameEndTime,

    #[msg("Number of tickets must be greater than 0.")]
    InvalidTicketCount,

    #[msg("Not enough funds for the tickets.")]
    InsufficientTicketFunds,

    #[msg("Not enough funds in the game account.")]
    InsufficientGameFunds,

    #[msg("The game has not been created yet.")]
    GameNotCreated,

    #[msg("The game has already ended.")]
    GameEnded,

    #[msg("The game has not ended yet.")]
    GameNotEnded,

    #[msg("There are not enough participants in the game.")]
    NotEnoughParticipants,

    #[msg("Winner has already been picked.")]
    WinnerAlreadyPicked,

    #[msg("Winner has already withdrawn.")]
    WinnerAlreadyWithdrawn,

    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
}
