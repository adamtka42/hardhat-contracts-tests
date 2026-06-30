const assert = require("assert");

const {
  RECIPIENT,
  deployQrlNFT,
  expectRejects,
  wait,
} = require("./helpers");

describe("QrlNFT", function () {
  this.timeout(600000);

  let from;
  let nft;

  before(async function () {
    const deployed = await deployQrlNFT();
    from = deployed.from;
    nft = deployed.contract;
  });

  it("exposes collection metadata", async function () {
    const [name] = await nft.callStatic.name();
    const [symbol] = await nft.callStatic.symbol();
    const [owner] = await nft.callStatic.owner();

    assert.strictEqual(name, "Hardhat NFT");
    assert.strictEqual(symbol, "HNFT");
    assert.strictEqual(owner.toLowerCase(), from.toLowerCase());
  });

  it("mints an NFT and emits a Transfer event", async function () {
    const receipt = await wait(
      await nft.functions.mint(from, "token-0", { from })
    );
    const transfers = nft
      .decodeReceiptLogs(receipt)
      .filter((log) => log.eventName === "Transfer");

    assert.strictEqual(transfers.length, 1);
    assert.strictEqual(transfers[0].args.to.toLowerCase(), from.toLowerCase());
    assert.strictEqual(transfers[0].args.tokenId.toString(10), "0");
  });

  it("returns owner, token URI, and total minted after mint", async function () {
    const [owner] = await nft.callStatic.ownerOf(0);
    const [uri] = await nft.callStatic.tokenURI(0);
    const [totalMinted] = await nft.callStatic.totalMinted();

    assert.strictEqual(owner.toLowerCase(), from.toLowerCase());
    assert.strictEqual(uri, "ipfs://base/token-0");
    assert.strictEqual(totalMinted.toString(10), "1");
  });

  it("transfers a minted NFT", async function () {
    await wait(await nft.functions.transferFrom(from, RECIPIENT, 0, { from }));
    const [owner] = await nft.callStatic.ownerOf(0);

    assert.strictEqual(owner.toLowerCase(), RECIPIENT.toLowerCase());
  });

  it("calculates royalty info", async function () {
    const [receiver, amount] = await nft.callStatic.royaltyInfo(0, 10000);

    assert.strictEqual(receiver.toLowerCase(), from.toLowerCase());
    assert.strictEqual(amount.toString(10), "500");
  });

  it("rejects minting above max supply", async function () {
    const deployed = await deployQrlNFT({ maxSupply: 1 });
    await wait(await deployed.contract.functions.mint(deployed.from, "one", { from: deployed.from }));

    await expectRejects(() =>
      deployed.contract.callStatic.mint(deployed.from, "two")
    );
  });

  it("rejects invalid royalty values", async function () {
    await expectRejects(() =>
      deployQrlNFT({ royaltyBps: 10001 })
    );
  });
});
