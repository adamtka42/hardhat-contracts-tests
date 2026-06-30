const hre = require("@theqrl/hardhat");

const WAIT_OPTIONS = { timeoutMs: 300000 };

async function wait(hash) {
  const receipt = await hre.qrl.waitForTransaction(
    hash,
    WAIT_OPTIONS.timeoutMs
  );

  if (
    receipt.status !== "0x1" &&
    receipt.status !== 1 &&
    receipt.status !== true
  ) {
    throw new Error(`Transaction ${hash} failed with status ${receipt.status}`);
  }

  return receipt;
}

function assertEqual(actual, expected, label) {
  if (String(actual) !== String(expected)) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

async function runQRL20(from) {
  const QRL20 = await hre.qrl.getContractFactory("QRL20");
  const deployment = await QRL20.deploy(
    { from },
    ["Hardhat QRL20", "HQ20", 8, 1000, 0],
    WAIT_OPTIONS
  );
  const token = await hre.qrl.getContractAt("QRL20", deployment.address);

  const [name] = await token.callStatic.name();
  const [symbol] = await token.callStatic.symbol();
  const [decimals] = await token.callStatic.decimals();
  const [initialBalance] = await token.callStatic.balanceOf(from);

  assertEqual(name, "Hardhat QRL20", "QRL20 name");
  assertEqual(symbol, "HQ20", "QRL20 symbol");
  assertEqual(decimals.toString(10), "8", "QRL20 decimals");
  assertEqual(initialBalance.toString(10), "1000", "QRL20 initial balance");

  const transferReceipt = await wait(
    await token.functions.transfer(from, 125, { from })
  );
  const transfers = token
    .decodeReceiptLogs(transferReceipt)
    .filter((log) => log.eventName === "Transfer");

  assertEqual(transfers.length, 1, "QRL20 Transfer events");
  assertEqual(
    transfers[0].args.value.toString(10),
    "125",
    "QRL20 transfer value"
  );

  await wait(await token.functions.mint(from, 250, { from }));
  const [mintedBalance] = await token.callStatic.balanceOf(from);
  assertEqual(mintedBalance.toString(10), "1250", "QRL20 minted balance");

  return {
    address: deployment.address,
    deployedHash: deployment.hash,
    mintedBalance: mintedBalance.toString(10),
  };
}

async function runQrlNFT(from) {
  const QrlNFT = await hre.qrl.getContractFactory("QrlNFT");
  const deployment = await QrlNFT.deploy(
    { from },
    ["Hardhat NFT", "HNFT", "ipfs://base/", 10, from, 500],
    WAIT_OPTIONS
  );
  const nft = await hre.qrl.getContractAt("QrlNFT", deployment.address);

  const [name] = await nft.callStatic.name();
  const [symbol] = await nft.callStatic.symbol();
  assertEqual(name, "Hardhat NFT", "NFT name");
  assertEqual(symbol, "HNFT", "NFT symbol");

  const mintReceipt = await wait(
    await nft.functions.mint(from, "token-0", { from })
  );
  const transfers = nft
    .decodeReceiptLogs(mintReceipt)
    .filter((log) => log.eventName === "Transfer");

  assertEqual(transfers.length, 1, "NFT Transfer events");
  assertEqual(
    transfers[0].args.to.toLowerCase(),
    from.toLowerCase(),
    "NFT transfer to"
  );
  assertEqual(transfers[0].args.tokenId.toString(10), "0", "NFT token id");

  const [owner] = await nft.callStatic.ownerOf(0);
  const [uri] = await nft.callStatic.tokenURI(0);
  const [totalMinted] = await nft.callStatic.totalMinted();

  assertEqual(owner.toLowerCase(), from.toLowerCase(), "NFT owner");
  assertEqual(uri, "ipfs://base/token-0", "NFT token URI");
  assertEqual(totalMinted.toString(10), "1", "NFT total minted");

  return {
    address: deployment.address,
    deployedHash: deployment.hash,
    owner,
    uri,
    totalMinted: totalMinted.toString(10),
  };
}

async function main() {
  const [from] = await hre.network.provider.send("qrl_accounts");
  const blockBefore = BigInt(
    await hre.network.provider.send("qrl_blockNumber")
  );

  const qrl20 = await runQRL20(from);
  const nft = await runQrlNFT(from);

  const blockAfter = BigInt(await hre.network.provider.send("qrl_blockNumber"));
  const result = {
    network: hre.network.name,
    from,
    blockDelta: (blockAfter - blockBefore).toString(10),
    qrl20,
    nft,
  };

  console.log("QRL_TOKEN_FLOW_RESULT=" + JSON.stringify(result));
  return result;
}

module.exports = { main };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
