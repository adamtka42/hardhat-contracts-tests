const assert = require("assert");

const {
  RECIPIENT,
  deployQRL20,
  expectRejects,
  wait,
} = require("./helpers");

describe("QRL20", function () {
  this.timeout(600000);

  let from;
  let token;

  before(async function () {
    const deployed = await deployQRL20();
    from = deployed.from;
    token = deployed.contract;
  });

  it("exposes token metadata", async function () {
    const [name] = await token.callStatic.name();
    const [symbol] = await token.callStatic.symbol();
    const [decimals] = await token.callStatic.decimals();
    const [owner] = await token.callStatic.owner();

    assert.strictEqual(name, "Hardhat QRL20");
    assert.strictEqual(symbol, "HQ20");
    assert.strictEqual(decimals.toString(10), "8");
    assert.strictEqual(owner.toLowerCase(), from.toLowerCase());
  });

  it("assigns the initial supply to the deployer", async function () {
    const [balance] = await token.callStatic.balanceOf(from);
    const [totalSupply] = await token.callStatic.totalSupply();

    assert.strictEqual(balance.toString(10), "1000");
    assert.strictEqual(totalSupply.toString(10), "1000");
  });

  it("simulates a token transfer without changing balances", async function () {
    const beforeFrom = (await token.callStatic.balanceOf(from))[0];
    const beforeRecipient = (await token.callStatic.balanceOf(RECIPIENT))[0];

    const [ok] = await token.callStatic.transfer(RECIPIENT, 125, { from });

    const afterFrom = (await token.callStatic.balanceOf(from))[0];
    const afterRecipient = (await token.callStatic.balanceOf(RECIPIENT))[0];

    assert.strictEqual(ok, true);
    assert.strictEqual(afterFrom.toString(10), beforeFrom.toString(10));
    assert.strictEqual(
      afterRecipient.toString(10),
      beforeRecipient.toString(10)
    );
  });

  it("simulates an approval without changing allowance", async function () {
    const [beforeAllowance] = await token.callStatic.allowance(from, RECIPIENT);

    const [ok] = await token.callStatic.approve(RECIPIENT, 77, { from });

    const [afterAllowance] = await token.callStatic.allowance(from, RECIPIENT);

    assert.strictEqual(ok, true);
    assert.strictEqual(afterAllowance.toString(10), beforeAllowance.toString(10));
  });

  it("transfers tokens and emits a Transfer event", async function () {
    const beforeFrom = (await token.callStatic.balanceOf(from))[0];
    const beforeRecipient = (await token.callStatic.balanceOf(RECIPIENT))[0];

    const receipt = await wait(
      await token.functions.transfer(RECIPIENT, 125, { from })
    );
    const transfers = token
      .decodeReceiptLogs(receipt)
      .filter((log) => log.eventName === "Transfer");

    const afterFrom = (await token.callStatic.balanceOf(from))[0];
    const afterRecipient = (await token.callStatic.balanceOf(RECIPIENT))[0];

    assert.strictEqual(transfers.length, 1);
    assert.strictEqual(transfers[0].args.from.toLowerCase(), from.toLowerCase());
    assert.strictEqual(
      transfers[0].args.to.toLowerCase(),
      RECIPIENT.toLowerCase()
    );
    assert.strictEqual(transfers[0].args.value.toString(10), "125");
    assert.strictEqual((beforeFrom - afterFrom).toString(10), "125");
    assert.strictEqual((afterRecipient - beforeRecipient).toString(10), "125");
  });

  it("lets the owner mint new tokens", async function () {
    const before = (await token.callStatic.balanceOf(from))[0];
    await wait(await token.functions.mint(from, 250, { from }));
    const after = (await token.callStatic.balanceOf(from))[0];

    assert.strictEqual((after - before).toString(10), "250");
  });

  it("supports allowance increase and decrease", async function () {
    await wait(await token.functions.increaseAllowance(RECIPIENT, 90, { from }));
    let [allowance] = await token.callStatic.allowance(from, RECIPIENT);
    assert.strictEqual(allowance.toString(10), "90");

    await wait(await token.functions.decreaseAllowance(RECIPIENT, 40, { from }));
    [allowance] = await token.callStatic.allowance(from, RECIPIENT);
    assert.strictEqual(allowance.toString(10), "50");
  });

  it("rejects transfers larger than the sender balance", async function () {
    await expectRejects(() =>
      token.callStatic.transfer(RECIPIENT, "999999999999999999999999")
    );
  });

  it("rejects minting above max supply", async function () {
    const deployed = await deployQRL20({ initialSupply: 100, maxSupply: 100 });

    await expectRejects(() =>
      deployed.contract.callStatic.mint(deployed.from, 1)
    );
  });
});
