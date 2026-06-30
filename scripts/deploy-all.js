const { main: deployQRL20 } = require("./deploy-qrl20");
const { main: deployNFT } = require("./deploy-nft");
const { main: deployQRNS } = require("./deploy-qrns");

async function main() {
  const qrl20 = await deployQRL20();
  const nft = await deployNFT();
  const qrns = await deployQRNS();
  const result = { qrl20, nft, qrns };

  console.log("ALL_DEPLOY_RESULT=" + JSON.stringify(result, null, 2));
  return result;
}

module.exports = { main };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
