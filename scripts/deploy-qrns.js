const hre = require("@theqrl/hardhat");

const WAIT_OPTIONS = { timeoutMs: 300000 };

async function main() {
  const [from] = await hre.network.provider.send("qrl_accounts");

  const QRNSRegistry = await hre.qrl.getContractFactory("QRNSRegistry");
  const registryDeployment = await QRNSRegistry.deploy(
    { from },
    "0x",
    WAIT_OPTIONS
  );

  const PublicResolver = await hre.qrl.getContractFactory("PublicResolver");
  const resolverDeployment = await PublicResolver.deploy(
    { from },
    [registryDeployment.address],
    WAIT_OPTIONS
  );

  const result = {
    network: hre.network.name,
    from,
    registry: registryDeployment.address,
    registryDeploymentHash: registryDeployment.hash,
    resolver: resolverDeployment.address,
    resolverDeploymentHash: resolverDeployment.hash,
  };

  console.log("QRNS_DEPLOY_RESULT=" + JSON.stringify(result, null, 2));
  return result;
}

module.exports = { main };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
