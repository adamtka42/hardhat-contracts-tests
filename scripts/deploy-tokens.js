const { main: deployQRL20 } = require("./deploy-qrl20");
const { main: deployNFT } = require("./deploy-nft");

async function main() {
  const qrl20 = await deployQRL20();
  const nft = await deployNFT();
  const result = { qrl20, nft };

  console.log("TOKEN_DEPLOY_RESULT=" + JSON.stringify(result, null, 2));
  return result;
}

module.exports = { main };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
