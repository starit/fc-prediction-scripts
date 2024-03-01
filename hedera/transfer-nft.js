console.clear();
require("dotenv").config();
const {
  AccountId,
  PrivateKey,
  Client,
  Hbar,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TransferTransaction,
  AccountBalanceQuery,
  TokenAssociateTransaction,
} = require("@hashgraph/sdk");

// Configure accounts and client, and generate needed keys
const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
const operatorKey = PrivateKey.fromString(process.env.OPERATOR_PVKEY);
const treasuryId = AccountId.fromString(process.env.TREASURY_ID);
const treasuryKey = PrivateKey.fromString(process.env.TREASURY_PVKEY);
// const aliceId = AccountId.fromString(process.env.ALICE_ID);
// const aliceKey = PrivateKey.fromString(process.env.ALICE_PVKEY);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);

const supplyKey = PrivateKey.generate();

async function transferNftToUser(tokenId, userId, userKey) {
  //Create the associate transaction and sign with User's key
  const associateAliceTx = await new TokenAssociateTransaction()
    .setAccountId(userId)
    .setTokenIds([tokenId])
    .freezeWith(client)
    .sign(userKey);

  //Submit the transaction to a Hedera network
  const associateAliceTxSubmit = await associateAliceTx.execute(client);

  //Get the transaction receipt
  const associateAliceRx = await associateAliceTxSubmit.getReceipt(client);

  //Confirm the transaction was successful
  console.log(
    `- NFT association with User's account: ${associateAliceRx.status}\n`
  );

  // Check the balance before the transfer for the treasury account
  var balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(treasuryId)
    .execute(client);
  console.log(
    `- Treasury balance: ${balanceCheckTx.tokens._map.get(
      tokenId.toString()
    )} NFTs of ID ${tokenId}`
  );

  // Check the balance before the transfer for User's account
  var balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(userId)
    .execute(client);
  console.log(
    `- User's balance: ${balanceCheckTx.tokens._map.get(
      tokenId.toString()
    )} NFTs of ID ${tokenId}`
  );

  // Transfer the NFT from treasury to User
  // Sign with the treasury key to authorize the transfer
  const tokenTransferTx = await new TransferTransaction()
    .addNftTransfer(tokenId, 1, treasuryId, userId)
    .freezeWith(client)
    .sign(treasuryKey);

  const tokenTransferSubmit = await tokenTransferTx.execute(client);
  const tokenTransferRx = await tokenTransferSubmit.getReceipt(client);

  console.log(
    `\n- NFT transfer from Treasury to Alice: ${tokenTransferRx.status} \n`
  );

  // Check the balance of the treasury account after the transfer
  var balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(treasuryId)
    .execute(client);
  console.log(
    `- Treasury balance: ${balanceCheckTx.tokens._map.get(
      tokenId.toString()
    )} NFTs of ID ${tokenId}`
  );

  // Check the balance of User's account after the transfer
  var balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(userId)
    .execute(client);
  console.log(
    `- User's balance: ${balanceCheckTx.tokens._map.get(
      tokenId.toString()
    )} NFTs of ID ${tokenId}`
  );
}
const tokenId = '0.0.3617127'
transferNftToUser('0.0.3617127',);
