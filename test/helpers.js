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

async function deploySQRCTF1Mock(options = {}) {
  const from = options.from || (await getDefaultAccount());
  const SQRCTF1Mock = await hre.qrl.getContractFactory("SQRCTF1Mock");
  const deployment = await SQRCTF1Mock.deploy(
    { from },
    [options.name || "Mock Fungible", options.symbol || "MOCK"],
    WAIT_OPTIONS
  );
  const contract = await hre.qrl.getContractAt(
    "SQRCTF1Mock",
    deployment.address
  );

  return { from, deployment, contract };
}

async function deploySQRCTN1Mock(options = {}) {
  const from = options.from || (await getDefaultAccount());
  const SQRCTN1Mock = await hre.qrl.getContractFactory("SQRCTN1Mock");
  const deployment = await SQRCTN1Mock.deploy(
    { from },
    [options.name || "Mock NFT", options.symbol || "MNFT"],
    WAIT_OPTIONS
  );
  const contract = await hre.qrl.getContractAt(
    "SQRCTN1Mock",
    deployment.address
  );

  return { from, deployment, contract };
}

async function deploySQRCTB1Mock(options = {}) {
  const from = options.from || (await getDefaultAccount());
  const SQRCTB1Mock = await hre.qrl.getContractFactory("SQRCTB1Mock");
  const deployment = await SQRCTB1Mock.deploy(
    { from },
    [options.uri || "ipfs://multi/{id}.json"],
    WAIT_OPTIONS
  );
  const contract = await hre.qrl.getContractAt(
    "SQRCTB1Mock",
    deployment.address
  );

  return { from, deployment, contract };
}

async function deploySQRCTB1ReceiverMock(options = {}) {
  const from = options.from || (await getDefaultAccount());
  const SQRCTB1ReceiverMock = await hre.qrl.getContractFactory(
    "SQRCTB1ReceiverMock"
  );
  const deployment = await SQRCTB1ReceiverMock.deploy(
    { from },
    "0x",
    WAIT_OPTIONS
  );
  const contract = await hre.qrl.getContractAt(
    "SQRCTB1ReceiverMock",
    deployment.address
  );

  return { from, deployment, contract };
}

async function deployCallContextMock(options = {}) {
  const from = options.from || (await getDefaultAccount());
  const CallContextMock = await hre.qrl.getContractFactory("CallContextMock");
  const deployment = await CallContextMock.deploy(
    { from },
    "0x",
    WAIT_OPTIONS
  );
  const contract = await hre.qrl.getContractAt(
    "CallContextMock",
    deployment.address
  );

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
  deployCallContextMock,
  deployQRL20,
  deployQrlNFT,
  deploySQRCTB1Mock,
  deploySQRCTB1ReceiverMock,
  deploySQRCTF1Mock,
  deploySQRCTN1Mock,
  expectRejects,
  getDefaultAccount,
  wait,
};
