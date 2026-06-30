const hre = require("@theqrl/hardhat");

const WAIT_OPTIONS = { timeoutMs: 300000 };

async function main() {
  const [from] = await hre.network.provider.send("qrl_accounts");
  const QRL20 = await hre.qrl.getContractFactory("QRL20");
  const deployment = await QRL20.deploy(
    { from },
    ["Hardhat QRL20", "HQ20", 8, 1000, 0],
    WAIT_OPTIONS
  );

  const result = {
    network: hre.network.name,
    from,
    qrl20: deployment.address,
    deploymentHash: deployment.hash,
  };

  console.log("QRL20_DEPLOY_RESULT=" + JSON.stringify(result, null, 2));
  return result;
}

module.exports = { main };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
