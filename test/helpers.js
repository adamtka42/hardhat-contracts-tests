const hre = require("@theqrl/hardhat");

const WAIT_OPTIONS = { timeoutMs: 300000 };
const RECIPIENT = "Q" + "02".repeat(64);

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

async function getDefaultAccount() {
  const [from] = await hre.network.provider.send("qrl_accounts");
  return from;
}

async function deployQRL20(options = {}) {
  const from = options.from || (await getDefaultAccount());
  const QRL20 = await hre.qrl.getContractFactory("QRL20");
  const deployment = await QRL20.deploy(
    { from },
    [
      options.name || "Hardhat QRL20",
      options.symbol || "HQ20",
      options.decimals ?? 8,
      options.initialSupply ?? 1000,
      options.maxSupply ?? 0,
    ],
    WAIT_OPTIONS
  );
  const contract = await hre.qrl.getContractAt("QRL20", deployment.address);

  return { from, deployment, contract };
}

async function deployQrlNFT(options = {}) {
  const from = options.from || (await getDefaultAccount());
  const QrlNFT = await hre.qrl.getContractFactory("QrlNFT");
  const deployment = await QrlNFT.deploy(
    { from },
    [
      options.name || "Hardhat NFT",
      options.symbol || "HNFT",
      options.baseURI || "ipfs://base/",
      options.maxSupply ?? 10,
      options.royaltyReceiver || from,
      options.royaltyBps ?? 500,
    ],
    WAIT_OPTIONS
  );
  const contract = await hre.qrl.getContractAt("QrlNFT", deployment.address);

  return { from, deployment, contract };
}

async function expectRejects(action, expectedMessage) {
  try {
    await action();
  } catch (error) {
    if (
      expectedMessage !== undefined &&
      !String(error.message).includes(expectedMessage)
    ) {
      throw new Error(
        `Expected error containing "${expectedMessage}", got: ${error.message}`
      );
    }
    return error;
  }

  throw new Error("Expected operation to reject");
}

module.exports = {
  RECIPIENT,
  WAIT_OPTIONS,
  deployQRL20,
  deployQrlNFT,
  expectRejects,
  getDefaultAccount,
  wait,
};
