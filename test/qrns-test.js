const assert = require("assert");
const hre = require("@theqrl/hardhat");

const { RECIPIENT, expectRejects, getDefaultAccount, wait } = require("./helpers");

const ROOT_NODE = "0x" + "00".repeat(32);
const ALICE_LABEL = "0x" + "11".repeat(32);
const BOB_ADDRESS = "Q" + "03".repeat(64);
async function deployQRNS() {
  const from = await getDefaultAccount();

  const QRNSRegistry = await hre.qrl.getContractFactory("QRNSRegistry");
  const registryDeployment = await QRNSRegistry.deploy(
    { from },
    "0x",
    { timeoutMs: 300000 }
  );
  const registry = await hre.qrl.getContractAt(
    "QRNSRegistry",
    registryDeployment.address
  );

  const PublicResolver = await hre.qrl.getContractFactory("PublicResolver");
  const resolverDeployment = await PublicResolver.deploy(
    { from },
    [registryDeployment.address],
    { timeoutMs: 300000 }
  );
  const resolver = await hre.qrl.getContractAt(
    "PublicResolver",
    resolverDeployment.address
  );

  return { from, registryDeployment, registry, resolverDeployment, resolver };
}

describe("QRNS", function () {
  this.timeout(600000);

  let from;
  let registry;
  let resolver;

  before(async function () {
    const deployed = await deployQRNS();
    from = deployed.from;
    registry = deployed.registry;
    resolver = deployed.resolver;
  });

  it("sets the root node owner to the deployer", async function () {
    const [owner] = await registry.callStatic.owner(ROOT_NODE);
    const [exists] = await registry.callStatic.recordExists(ROOT_NODE);

    assert.strictEqual(owner.toLowerCase(), from.toLowerCase());
    assert.strictEqual(exists, true);
  });

  it("stores resolver and ttl records in the registry", async function () {
    await wait(await registry.functions.setResolver(ROOT_NODE, resolver.address, { from }));
    await wait(await registry.functions.setTTL(ROOT_NODE, 3600, { from }));

    const [storedResolver] = await registry.callStatic.resolver(ROOT_NODE);
    const [ttl] = await registry.callStatic.ttl(ROOT_NODE);

    assert.strictEqual(storedResolver.toLowerCase(), resolver.address.toLowerCase());
    assert.strictEqual(ttl.toString(10), "3600");
  });

  it("resolves root node addresses through PublicResolver", async function () {
    const receipt = await wait(
      await resolver.functions["setAddr(bytes32,address)"](ROOT_NODE, RECIPIENT, { from })
    );
    const events = resolver
      .decodeReceiptLogs(receipt)
      .filter((log) => log.eventName === "AddrChanged");
    const [resolved] = await resolver.callStatic["addr(bytes32)"](ROOT_NODE);

    assert.strictEqual(events.length, 1);
    assert.strictEqual(resolved.toLowerCase(), RECIPIENT.toLowerCase());
  });

  it("stores text, name, pubkey, and contenthash records", async function () {
    await wait(await resolver.functions.setText(ROOT_NODE, "url", "https://qrl.test", { from }));
    await wait(await resolver.functions.setName(ROOT_NODE, "alice.qrl", { from }));
    await wait(
      await resolver.functions.setPubkey(
        ROOT_NODE,
        "0x" + "aa".repeat(32),
        "0x" + "bb".repeat(32),
        { from }
      )
    );
    await wait(await resolver.functions.setContenthash(ROOT_NODE, "0x1234", { from }));

    const [text] = await resolver.callStatic.text(ROOT_NODE, "url");
    const [name] = await resolver.callStatic.name(ROOT_NODE);
    const [x, y] = await resolver.callStatic.pubkey(ROOT_NODE);
    const [contenthash] = await resolver.callStatic.contenthash(ROOT_NODE);

    assert.strictEqual(text, "https://qrl.test");
    assert.strictEqual(name, "alice.qrl");
    assert.strictEqual(x.toLowerCase(), "0x" + "aa".repeat(32));
    assert.strictEqual(y.toLowerCase(), "0x" + "bb".repeat(32));
    assert.strictEqual(contenthash.toLowerCase(), "0x1234");
  });

  it("creates and resolves a subnode", async function () {
    const subnodeReceipt = await wait(
      await registry.functions.setSubnodeRecord(
        ROOT_NODE,
        ALICE_LABEL,
        from,
        resolver.address,
        7200,
        { from }
      )
    );
    const newResolverEvents = registry
      .decodeReceiptLogs(subnodeReceipt)
      .filter((log) => log.eventName === "NewResolver");
    assert.strictEqual(newResolverEvents.length, 1);
    const aliceNode = newResolverEvents[0].args.node;

    const [owner] = await registry.callStatic.owner(aliceNode);
    const [storedResolver] = await registry.callStatic.resolver(aliceNode);
    const [ttl] = await registry.callStatic.ttl(aliceNode);

    await wait(
      await resolver.functions["setAddr(bytes32,address)"](aliceNode, BOB_ADDRESS, { from })
    );
    const [resolved] = await resolver.callStatic["addr(bytes32)"](aliceNode);

    assert.strictEqual(owner.toLowerCase(), from.toLowerCase());
    assert.strictEqual(storedResolver.toLowerCase(), resolver.address.toLowerCase());
    assert.strictEqual(ttl.toString(10), "7200");
    assert.strictEqual(resolved.toLowerCase(), BOB_ADDRESS.toLowerCase());
  });

  it("rejects unauthorised resolver writes", async function () {
    await expectRejects(() =>
      resolver.functions["setAddr(bytes32,address)"](ROOT_NODE, BOB_ADDRESS, {
        from: RECIPIENT,
      })
    );
  });

  it("supports resolver operator approvals", async function () {
    await wait(await resolver.functions.setApprovalForAll(RECIPIENT, true, { from }));
    const [approved] = await resolver.callStatic.isApprovedForAll(from, RECIPIENT);

    assert.strictEqual(approved, true);
  });
});
