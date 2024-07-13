import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { LotterySolana } from "../target/types/lottery_solana";
import { expect } from "chai";

describe("create_game", () => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.LotterySolana as Program<LotterySolana>;

  before(async () => {
    // Allocate space for the game account (adjust size as needed)
    const lamportsForCreator = await provider.connection.getMinimumBalanceForRentExemption(
      8 + 32
    );
    const lamportsForGame = await provider.connection.getMinimumBalanceForRentExemption(
      8 + 32 + 8 + 8 + 8 + 8 + 1 + 1 + 8
    );

    // Request airdrop for the provider wallet
    const airdropSignature = await provider.connection.requestAirdrop(
      provider.wallet.publicKey,
      2 * (lamportsForCreator + lamportsForGame)
    );

    const latestBlockHash = await provider.connection.getLatestBlockhash();

    await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: airdropSignature,
    });
  });

  it("initializes the creator account and create the game account correctly with valid end time", async () => {

    const [counterPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("creator_account"),
        provider.wallet.publicKey.toBuffer()
      ],
      program.programId
    );


    const counterData = await provider.connection.getAccountInfo(counterPDA);
    if (!counterData) {
      // Initialize creatorAcc account
      const tx = await program.methods
        .initializeCreator()
        .accounts({
          creatorAcc: counterPDA,
          creator: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

        await provider.connection.confirmTransaction(tx);
    }

    const updatedCounterData = await provider.connection.getAccountInfo(counterPDA);

    // Assuming game_count is at offset 32 (adjust if different)
    const gameCount = updatedCounterData.data.readUInt32LE(32);

    const [gamePDA, _] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("game_account"),
        provider.wallet.publicKey.toBuffer(),
        new anchor.BN(gameCount).toArrayLike(Buffer, "le", 4), // Convert gameCount to buffer
      ],
      program.programId
    );

    const endTime = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
    // Create transaction for creating the game account
    await program.methods
      .createGame(endTime) // One hour from now
      .accounts({
        game: gamePDA,
        creatorAcc: counterPDA,
        creator: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Fetch the game account data using the fetch method
    const game = await program.account.game.fetch(gamePDA);

    expect(game.creator.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
    expect(game.endTime.toNumber()).to.be.at.least(Math.floor(Date.now() / 1000));
    expect(game.prizePool.toNumber()).to.equal(0);
    expect(game.totalTickets).to.equal(0);
    expect(game.winner).to.be.null;
    expect(game.winnerWithdrawn).to.be.false;

    const counter = await program.account.creator.fetch(counterPDA);

    expect(counter.creator.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
    expect(counter.gameCount).to.equal(1);
  });
});
