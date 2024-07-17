import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { LotterySolana } from "../target/types/lottery_solana";
import { expect } from "chai";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";

describe("Tests for lottery_solana", () => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.LotterySolana as Program<LotterySolana>;

  const player1 = Keypair.generate();
  const player2 = Keypair.generate();

  const LAMPORTS_PER_SOL = 1000000000;
  const TICKET_PRICE = parseInt(program.idl.constants.find(x => x.name == "ticketPrice").value);

  let ticketAccounts: PublicKey[] = [];

  before(async () => {
    // Allocate space for the game account (adjust size as needed)
    const lamportsForCreator = await provider.connection.getMinimumBalanceForRentExemption(
      8 + 32 + 4
    );
    const lamportsForGame = await provider.connection.getMinimumBalanceForRentExemption(
      8 + 32 + 8 + 8 + 8 + 8 + 1 + 1 + 8
    );

    // Request airdrop for the provider wallet
    const airdropSignature = await provider.connection.requestAirdrop(
      provider.wallet.publicKey,
      2 * (lamportsForCreator + lamportsForGame)
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        player1.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        player2.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );

    const latestBlockHash = await provider.connection.getLatestBlockhash();

    await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: airdropSignature,
    });
  });

  it("initializes the creator account and create the game account correctly with valid end time", async () => {

    const [creatorPDA] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("creator_account"),
        provider.wallet.publicKey.toBuffer()
      ],
      program.programId
    );


    const counterData = await provider.connection.getAccountInfo(creatorPDA);
    if (!counterData) {
      // Initialize creatorAcc account
      const tx = await program.methods
        .initializeCreator()
        .accounts({
          creatorAcc: creatorPDA,
          creator: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await provider.connection.confirmTransaction(tx);
    }

    // Get game count
    let gameCount: number = (await program.account.creator.fetch(creatorPDA)).gameCount;
    // Consutruct buffer containing latest index
    const buf1 = Buffer.alloc(4);
    buf1.writeUIntBE(gameCount, 0, 4);

    const [gamePDA, _] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("game_account"),
        provider.wallet.publicKey.toBuffer(),
        buf1
      ],
      program.programId
    );

    const endTime = new anchor.BN(Math.floor(Date.now() / 1000) + 10);
    // Create transaction for creating the game account
    await program.methods
      .createGame(endTime) // Ten seconds from now
      .accounts({
        game: gamePDA,
        creatorAcc: creatorPDA,
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
    expect(game.winnerTicket).to.be.null;
    expect(game.winnerWithdrawn).to.be.false;

    const counter = await program.account.creator.fetch(creatorPDA);

    expect(counter.creator.toBase58()).to.equal(provider.wallet.publicKey.toBase58());
    expect(counter.gameCount).to.equal(1);
  });


  it("Player 1 buys a lottery ticket", async () => {
    const [creatorPDA] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("creator_account"),
        provider.wallet.publicKey.toBuffer()
      ],
      program.programId
    );

    let gameCount = (await program.account.creator.fetch(creatorPDA)).gameCount;
    const buf1 = Buffer.alloc(4);
    buf1.writeUIntBE(gameCount - 1, 0, 4);

    const [gamePDA, _] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("game_account"),
        provider.wallet.publicKey.toBuffer(),
        buf1
      ],
      program.programId
    );

    let totalTickets = (await program.account.game.fetch(gamePDA)).totalTickets;
    const buf2 = Buffer.alloc(4);
    buf2.writeUIntBE(totalTickets, 0, 4);

    // PDA for ticket and player stats
    const [ticketPDA] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("ticket_account"),
        gamePDA.toBuffer(),
        buf2
      ],
      program.programId
    );

    ticketAccounts.push(ticketPDA);

    const [playerPDA] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("player_account"),
        gamePDA.toBuffer(),
        player1.publicKey.toBuffer()
      ],
      program.programId
    );

    // Get starting balances
    let startBalancePlayer = await provider.connection.getBalance(player1.publicKey);

    await program.methods
      .buyTicket()
      .accounts({
        ticket: ticketPDA,
        playerStats: playerPDA,
        player: player1.publicKey,
        game: gamePDA,
        systemProgram: SystemProgram.programId
      })
      .signers([player1])
      .rpc();

    console.log(ticketPDA.toBase58());

    // Fetch the ticket account data using the fetch method
    const ticket = await program.account.ticket.fetch(ticketPDA);
    const playerStats = await program.account.player.fetch(playerPDA);
    const game = await program.account.game.fetch(gamePDA);

    // Verify the ticket data
    expect(ticket.owner.toBase58()).to.equal(player1.publicKey.toBase58());
    expect(ticket.id).to.equal(0);

    // Verify the player stats data
    expect(playerStats.player.toBase58()).to.equal(player1.publicKey.toBase58());
    expect(playerStats.amount.toNumber()).to.equal(TICKET_PRICE);
    expect(playerStats.ticketCount).to.equal(1);

    // Verify the game state
    expect(game.prizePool.toNumber()).to.equal(TICKET_PRICE);
    expect(game.totalTickets).to.equal(1);

    // Verify the balance change for the player
    let endBalancePlayer = await provider.connection.getBalance(player1.publicKey);
    expect(startBalancePlayer - endBalancePlayer).to.be.at.least(TICKET_PRICE);
  });

  it("Player 2 buys a lottery ticket", async () => {
    const [creatorPDA] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("creator_account"),
        provider.wallet.publicKey.toBuffer()
      ],
      program.programId
    );

    let gameCount = (await program.account.creator.fetch(creatorPDA)).gameCount;
    const buf1 = Buffer.alloc(4);
    buf1.writeUIntBE(gameCount - 1, 0, 4);

    const [gamePDA, _] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("game_account"),
        provider.wallet.publicKey.toBuffer(),
        buf1
      ],
      program.programId
    );

    let totalTickets = (await program.account.game.fetch(gamePDA)).totalTickets;
    const buf2 = Buffer.alloc(4);
    buf2.writeUIntBE(totalTickets, 0, 4);

    // PDA for ticket and player stats
    const [ticketPDA] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("ticket_account"),
        gamePDA.toBuffer(),
        buf2
      ],
      program.programId
    );

    ticketAccounts.push(ticketPDA);

    const [playerPDA] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("player_account"),
        gamePDA.toBuffer(),
        player2.publicKey.toBuffer()
      ],
      program.programId
    );

    // Get starting balances
    let startBalancePlayer = await provider.connection.getBalance(player2.publicKey);

    await program.methods
      .buyTicket()
      .accounts({
        ticket: ticketPDA,
        playerStats: playerPDA,
        player: player2.publicKey,
        game: gamePDA,
        systemProgram: SystemProgram.programId
      })
      .signers([player2])
      .rpc();

    // Fetch the ticket account data using the fetch method
    const ticket = await program.account.ticket.fetch(ticketPDA);
    const playerStats = await program.account.player.fetch(playerPDA);
    const game = await program.account.game.fetch(gamePDA);

    console.log(ticketPDA.toBase58());
    // Verify the ticket data
    expect(ticket.owner.toBase58()).to.equal(player2.publicKey.toBase58());
    expect(ticket.id).to.equal(1);

    // Verify the player stats data
    expect(playerStats.player.toBase58()).to.equal(player2.publicKey.toBase58());
    expect(playerStats.amount.toNumber()).to.equal(TICKET_PRICE);
    expect(playerStats.ticketCount).to.equal(1);

    // Verify the game state
    expect(game.prizePool.toNumber()).to.equal(2 * TICKET_PRICE);
    expect(game.totalTickets).to.equal(2);

    // Verify the balance change for the player
    let endBalancePlayer = await provider.connection.getBalance(player2.publicKey);
    expect(startBalancePlayer - endBalancePlayer).to.be.at.least(TICKET_PRICE);
  });

  it("Picks a winner correctly", async () => {
    const [creatorPDA] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("creator_account"),
        provider.wallet.publicKey.toBuffer()
      ],
      program.programId
    );

    const gameCount = (await program.account.creator.fetch(creatorPDA)).gameCount;
    const buf1 = Buffer.alloc(4);
    buf1.writeUIntBE(gameCount - 1, 0, 4);

    const [gamePDA] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("game_account"),
        provider.wallet.publicKey.toBuffer(),
        buf1
      ],
      program.programId
    );

    await new Promise(resolve => setTimeout(resolve, 10000));

    const accountMetas: anchor.web3.AccountMeta[] = ticketAccounts.map(publicKey => ({
      pubkey: publicKey,
      isSigner: false,
      isWritable: false,
    }));

    const tx = await program.methods
      .pickWinner()
      .accounts({
        game: gamePDA,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(accountMetas)
      .rpc();

    await provider.connection.confirmTransaction(tx);

    // Fetch the game account data again
    const updatedGame = await program.account.game.fetch(gamePDA);

    // Assert winner is set but haven't withdrawn yet
    expect(updatedGame.winnerTicket).to.not.be.null;
    expect(updatedGame.winnerWithdrawn).to.be.false;
    console.log(`Winner is: ${updatedGame.winnerTicket}`);
  });

  it("Withdraws the winner's prize correctly", async () => {

    const [creatorPDA] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("creator_account"),
        provider.wallet.publicKey.toBuffer()
      ],
      program.programId
    );

    const gameCount = (await program.account.creator.fetch(creatorPDA)).gameCount;
    const buf1 = Buffer.alloc(4);
    buf1.writeUIntBE(gameCount - 1, 0, 4);

    const [gamePDA] = PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("game_account"),
        provider.wallet.publicKey.toBuffer(),
        buf1
      ],
      program.programId
    );

    const winnerTicket = (await program.account.game.fetch(gamePDA)).winnerTicket;
    const playerThatWon = (await program.account.ticket.fetch(winnerTicket)).owner;

    // Fetch initial balances
    const initialWinnerBalance = await provider.connection.getBalance(playerThatWon);
    const initialOwnerBalance = await provider.connection.getBalance(provider.wallet.publicKey);

    const tx = await program.methods
      .winnerWithdraw()
      .accounts({
        game: gamePDA,
        winnerTicket: winnerTicket,
        winner: playerThatWon,
        owner: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([playerThatWon])
      .rpc();

    console.log(tx);

    // Confirm the transaction
    await provider.connection.confirmTransaction(tx);

    // Fetch the updated game state after withdrawal
    const updatedGame = await program.account.game.fetch(gamePDA);

    // Fetch updated balances
    const updatedWinnerBalance = await provider.connection.getBalance(playerThatWon);
    const updatedOwnerBalance = await provider.connection.getBalance(provider.wallet.publicKey);

    // Assertions
    expect(updatedGame.winnerWithdrawn).to.equal(true);

    // Calculate the amount sent to the winner and the fee
    const amountAsFee = updatedOwnerBalance - initialOwnerBalance;
    const amountToWinner = updatedWinnerBalance - initialWinnerBalance;

    console.log(`Amount sent to winner: ${amountToWinner / LAMPORTS_PER_SOL} SOL`);
    console.log(`Amount received as fee: ${amountAsFee / LAMPORTS_PER_SOL} SOL`);

    // Assert balances
    expect(updatedWinnerBalance).to.be.greaterThan(initialWinnerBalance);
    expect(updatedOwnerBalance).to.be.greaterThan(initialOwnerBalance);

    expect(updatedOwnerBalance - initialOwnerBalance).to.equal(amountAsFee);
    expect(updatedWinnerBalance - initialWinnerBalance).to.equal(amountToWinner);

    // Log balances before and after
    console.log(`Initial Winner Balance: ${initialWinnerBalance / LAMPORTS_PER_SOL} SOL`);
    console.log(`Updated Winner Balance: ${updatedWinnerBalance / LAMPORTS_PER_SOL} SOL`);
    console.log(`Initial Owner Balance: ${initialOwnerBalance / LAMPORTS_PER_SOL} SOL`);
    console.log(`Updated Owner Balance: ${updatedOwnerBalance / LAMPORTS_PER_SOL} SOL`);
  });
});
