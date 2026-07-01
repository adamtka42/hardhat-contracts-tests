const assert = require("assert");
const hre = require("@theqrl/hardhat");

const { deployCallContextMock } = require("./helpers");

describe("QRL call context", function () {
  this.timeout(600000);

  let context;
  let from;

  before(async function () {
    const deployed = await deployCallContextMock();
    context = deployed.contract;
    from = deployed.from;
  });

  it("simulates value and transaction context without changing contract balance", async function () {
    const [beforeBalance] = await hre.network.provider.send("qrl_getBalance", [
      context.address,
    ]);

    const [msgValue, selfBalance, chainId, baseFee, gasPrice] =
      await context.callStatic.observe({
        from,
        value: 42,
        maxFeePerGas: 20,
        maxPriorityFeePerGas: 5,
      });

    const [afterBalance] = await hre.network.provider.send("qrl_getBalance", [
      context.address,
    ]);

    assert.strictEqual(BigInt(beforeBalance).toString(10), "0");
    assert.strictEqual(msgValue.toString(10), "42");
    assert.strictEqual(selfBalance.toString(10), "42");
    assert.strictEqual(chainId.toString(10), "1");
    assert.strictEqual(baseFee.toString(10), "0");
    assert.strictEqual(gasPrice.toString(10), "5");
    assert.strictEqual(BigInt(afterBalance).toString(10), "0");
  });
});
