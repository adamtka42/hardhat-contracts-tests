const hre = require("@theqrl/hardhat");

const WAIT_OPTIONS = { timeoutMs: 300000 };

async function main() {
  const [from] = await hre.network.provider.send("qrl_accounts");
  const QrlNFT = await hre.qrl.getContractFactory("QrlNFT");
  const deployment = await QrlNFT.deploy(
    { from },
    ["Hardhat NFT", "HNFT", "ipfs://base/", 10, from, 500],
    WAIT_OPTIONS
  );

  const result = {
    network: hre.network.name,
    from,
    nft: deployment.address,
    deploymentHash: deployment.hash,
  };

  console.log("NFT_DEPLOY_RESULT=" + JSON.stringify(result, null, 2));
  return result;
}

module.exports = { main };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
