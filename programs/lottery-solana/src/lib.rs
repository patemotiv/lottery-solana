use anchor_lang::prelude::*;

declare_id!("HsKw5odRfszH8rUUU5RYzxBS3KwSG3Yiy3BxX67GcJb2");

#[program]
pub mod lottery_solana {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
