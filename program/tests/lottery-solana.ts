import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { LotterySolana } from "../target/types/lottery_solana";
import { expect } from "chai";

describe("create_game", () => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.LotterySolana as Program<LotterySolana>;

  const creatorAcc = Keypair.generate();

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

    // Initialize creatorAcc account
    const tx = await program.methods
      .initializeCreator()
      .accounts({
        creatorAcc: creatorAcc.publicKey,
        creator: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([creatorAcc])
      .rpc();

      console.log(`Use 'solana confirm -v ${tx}' to see the logs`);

      latestBlockHash = await provider.connection.getLatestBlockhash();

      await provider.connection.confirmTransaction({
        signature: tx,
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      });
  });

  it("initializes the game account correctly with valid end time", async () => {

    const counterData = await provider.connection.getAccountInfo(creatorAcc.publicKey);
      // Assuming game_count is at offset 32 (adjust if different)
    const gameCount = counterData.data.readUInt32LE(32);

    const [gamePDA, bump] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from("game_account"),
        provider.wallet.publicKey.toBuffer(),
        Buffer.from(gameCount.toString()), // Convert gameCount to buffer
      ],
      program.programId
    );

    // Create transaction for creating the game account
    const tx = await program.methods
      .createGame(Math.floor(Date.now() / 1000) + 3600) // One hour from now
      .accounts({
        game: gamePDA,
        creatorAcc: creatorAcc.publicKey,
        creator: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const latestBlockHash = await provider.connection.getLatestBlockhash();

    await provider.connection.confirmTransaction({
      signature: tx,
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    });

    // Fetch the game account data using the fetch method
    const game = await program.account.game.fetch(gameAccount.publicKey);

    expect(game.creator.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
    expect(game.endTime.toNumber()).to.be.at.least(Math.floor(Date.now() / 1000));
    expect(game.prizePool.toNumber()).to.equal(0);
    expect(game.totalTickets).to.equal(0);
    expect(game.winner).to.be.null;
    expect(game.winnerWithdrawn).to.be.false;

    const counter = await program.account.creator.fetch(creatorAcc.publicKey);

    expect(counter.creator.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
    expect(counter.gameCount).to.equal(1);
  });
});
