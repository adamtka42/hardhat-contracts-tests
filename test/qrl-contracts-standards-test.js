const assert = require("assert");

const {
  RECIPIENT,
  deploySQRCTB1Mock,
  deploySQRCTB1ReceiverMock,
  deploySQRCTF1Mock,
  deploySQRCTN1Mock,
  expectRejects,
  wait,
} = require("./helpers");

const OPERATOR = "Q" + "03".repeat(64);

describe("@theqrl/qrl-contracts standards", function () {
  this.timeout(600000);

  describe("SQRCTF1", function () {
    let from;
    let token;

    before(async function () {
      const deployed = await deploySQRCTF1Mock();
      from = deployed.from;
      token = deployed.contract;
    });

    it("exposes fungible token metadata", async function () {
      const [name] = await token.callStatic.name();
      const [symbol] = await token.callStatic.symbol();
      const [decimals] = await token.callStatic.decimals();

      assert.strictEqual(name, "Mock Fungible");
      assert.strictEqual(symbol, "MOCK");
      assert.strictEqual(decimals.toString(10), "18");
    });

    it("mints, transfers, approves, and burns balances", async function () {
      await wait(await token.functions.mint(from, 1000, { from, gas: 30000000 }));
      await wait(await token.functions.transfer(RECIPIENT, 125, { from, gas: 30000000 }));
      await wait(await token.functions.approve(OPERATOR, 80, { from, gas: 30000000 }));
      await wait(
        await token.functions.transferFrom(from, RECIPIENT, 30, {
          from: OPERATOR,
          gas: 30000000,
        })
      );
      await wait(await token.functions.burn(RECIPIENT, 25, { from, gas: 30000000 }));

      const [fromBalance] = await token.callStatic.balanceOf(from);
      const [recipientBalance] = await token.callStatic.balanceOf(RECIPIENT);
      const [allowance] = await token.callStatic.allowance(from, OPERATOR);
      const [totalSupply] = await token.callStatic.totalSupply();

      assert.strictEqual(fromBalance.toString(10), "845");
      assert.strictEqual(recipientBalance.toString(10), "130");
      assert.strictEqual(allowance.toString(10), "50");
      assert.strictEqual(totalSupply.toString(10), "975");
    });

    it("simulates a fungible transfer without changing balances", async function () {
      const [beforeFrom] = await token.callStatic.balanceOf(from);
      const [beforeRecipient] = await token.callStatic.balanceOf(RECIPIENT);

      const [ok] = await token.callStatic.transfer(RECIPIENT, 10, {
        from,
        gas: 30000000,
      });

      const [afterFrom] = await token.callStatic.balanceOf(from);
      const [afterRecipient] = await token.callStatic.balanceOf(RECIPIENT);

      assert.strictEqual(ok, true);
      assert.strictEqual(afterFrom.toString(10), beforeFrom.toString(10));
      assert.strictEqual(
        afterRecipient.toString(10),
        beforeRecipient.toString(10)
      );
    });

    it("simulates an approval without changing allowance", async function () {
      const [beforeAllowance] = await token.callStatic.allowance(from, OPERATOR);

      const [ok] = await token.callStatic.approve(OPERATOR, 33, {
        from,
        gas: 30000000,
      });

      const [afterAllowance] = await token.callStatic.allowance(from, OPERATOR);

      assert.strictEqual(ok, true);
      assert.strictEqual(
        afterAllowance.toString(10),
        beforeAllowance.toString(10)
      );
    });

    it("rejects transfers above balance", async function () {
      await expectRejects(() =>
        token.callStatic.transfer(RECIPIENT, "999999999999999999999999", {
          from,
        })
      );
    });
  });

  describe("SQRCTN1", function () {
    let from;
    let nft;

    before(async function () {
      const deployed = await deploySQRCTN1Mock();
      from = deployed.from;
      nft = deployed.contract;
    });

    it("exposes NFT metadata", async function () {
      const [name] = await nft.callStatic.name();
      const [symbol] = await nft.callStatic.symbol();

      assert.strictEqual(name, "Mock NFT");
      assert.strictEqual(symbol, "MNFT");
    });

    it("mints, approves, transfers, and burns NFTs", async function () {
      const mintReceipt = await wait(
        await nft.functions.mint(from, 1, { from, gas: 30000000 })
      );
      const transfers = nft
        .decodeReceiptLogs(mintReceipt)
        .filter((log) => log.eventName === "Transfer");

      assert.strictEqual(transfers.length, 1);
      assert.strictEqual(transfers[0].args.to.toLowerCase(), from.toLowerCase());
      assert.strictEqual(transfers[0].args.tokenId.toString(10), "1");

      await wait(await nft.functions.approve(OPERATOR, 1, { from, gas: 30000000 }));
      const [approved] = await nft.callStatic.getApproved(1);
      assert.strictEqual(approved.toLowerCase(), OPERATOR.toLowerCase());

      await wait(
        await nft.functions.transferFrom(from, RECIPIENT, 1, {
          from: OPERATOR,
          gas: 30000000,
        })
      );
      const [owner] = await nft.callStatic.ownerOf(1);
      assert.strictEqual(owner.toLowerCase(), RECIPIENT.toLowerCase());

      await wait(await nft.functions.burn(1, { from, gas: 30000000 }));
      await expectRejects(() => nft.callStatic.ownerOf(1));
    });

    it("simulates an NFT transfer without changing owner", async function () {
      await wait(await nft.functions.mint(from, 3, { from, gas: 30000000 }));
      const [beforeOwner] = await nft.callStatic.ownerOf(3);

      await nft.callStatic.transferFrom(from, RECIPIENT, 3, {
        from,
        gas: 30000000,
      });

      const [afterOwner] = await nft.callStatic.ownerOf(3);

      assert.strictEqual(beforeOwner.toLowerCase(), from.toLowerCase());
      assert.strictEqual(afterOwner.toLowerCase(), beforeOwner.toLowerCase());
    });

    it("supports operator approvals", async function () {
      await wait(await nft.functions.mint(from, 2, { from, gas: 30000000 }));
      await wait(await nft.functions.setApprovalForAll(OPERATOR, true, { from, gas: 30000000 }));

      const [approved] = await nft.callStatic.isApprovedForAll(from, OPERATOR);
      assert.strictEqual(approved, true);

      await wait(
        await nft.functions.transferFrom(from, RECIPIENT, 2, {
          from: OPERATOR,
          gas: 30000000,
        })
      );
      const [owner] = await nft.callStatic.ownerOf(2);
      assert.strictEqual(owner.toLowerCase(), RECIPIENT.toLowerCase());
    });
  });

  describe("SQRCTB1", function () {
    let from;
    let multiToken;
    let receiver;

    before(async function () {
      const deployed = await deploySQRCTB1Mock();
      const receiverDeployment = await deploySQRCTB1ReceiverMock({
        from: deployed.from,
      });
      from = deployed.from;
      multiToken = deployed.contract;
      receiver = receiverDeployment.contract;
    });

    it("returns and updates the shared metadata URI", async function () {
      let [uri] = await multiToken.callStatic.uri(1);
      assert.strictEqual(uri, "ipfs://multi/{id}.json");

      await wait(
        await multiToken.functions.setURI("ipfs://updated/{id}.json", {
          from,
          gas: 30000000,
        })
      );
      [uri] = await multiToken.callStatic.uri(99);
      assert.strictEqual(uri, "ipfs://updated/{id}.json");
    });

    it("mints single and batch token balances", async function () {
      const receipt = await wait(
        await multiToken.functions.mint(receiver.address, 0, 50, {
          from,
          gas: 30000000,
        })
      );
      const transfers = multiToken
        .decodeReceiptLogs(receipt)
        .filter((log) => log.eventName === "TransferSingle");
      assert.strictEqual(transfers.length, 1);
      assert.strictEqual(
        transfers[0].args.to.toLowerCase(),
        receiver.address.toLowerCase()
      );

      await wait(
        await multiToken.functions.mintBatch(
          receiver.address,
          [0],
          [60],
          { from, gas: 30000000 }
        )
      );

      const [balance7] = await multiToken.callStatic.balanceOf(
        receiver.address,
        0
      );
      const [balances] = await multiToken.callStatic.balanceOfBatch(
        [receiver.address, receiver.address],
        [0, 0]
      );

      assert.strictEqual(balance7.toString(10), "110");
      assert.strictEqual(balances[0].toString(10), "110");
      assert.strictEqual(balances[1].toString(10), "110");
    });

    it("transfers and burns a token id", async function () {
      await wait(
        await multiToken.functions.mintBatch(from, [0], [50], {
          from,
          gas: 30000000,
        })
      );
      await wait(
        await multiToken.functions.transferBatch(from, RECIPIENT, [0], [15], {
          from,
          gas: 30000000,
        })
      );
      await wait(
        await multiToken.functions.burn(RECIPIENT, 0, 5, {
          from,
          gas: 30000000,
        })
      );

      const [fromBalance] = await multiToken.callStatic.balanceOf(from, 0);
      const [recipientBalance] = await multiToken.callStatic.balanceOf(
        RECIPIENT,
        0
      );
      assert.strictEqual(fromBalance.toString(10), "35");
      assert.strictEqual(recipientBalance.toString(10), "10");
    });

    it("supports operator approvals, batch transfers, and balanceOfBatch", async function () {
      await wait(
        await multiToken.functions.mintBatch(from, [0], [100], {
          from,
          gas: 30000000,
        })
      );
      await wait(
        await multiToken.functions.setApprovalForAll(OPERATOR, true, {
          from,
          gas: 30000000,
        })
      );

      const [approved] = await multiToken.callStatic.isApprovedForAll(
        from,
        OPERATOR
      );
      assert.strictEqual(approved, true);

      await wait(
        await multiToken.functions.transferBatch(
          from,
          RECIPIENT,
          [0],
          [10],
          { from: OPERATOR, gas: 30000000 }
        )
      );

      const [balances] = await multiToken.callStatic.balanceOfBatch(
        [from, RECIPIENT, from, RECIPIENT],
        [0, 0, 0, 0]
      );

      assert.strictEqual(balances[0].toString(10), "125");
      assert.strictEqual(balances[1].toString(10), "20");
      assert.strictEqual(balances[2].toString(10), "125");
      assert.strictEqual(balances[3].toString(10), "20");
    });

    it("simulates a batch transfer without changing balances", async function () {
      await wait(
        await multiToken.functions.mintBatch(from, [0], [40], {
          from,
          gas: 30000000,
        })
      );
      const [beforeBalances] = await multiToken.callStatic.balanceOfBatch(
        [from, RECIPIENT],
        [0, 0]
      );

      await multiToken.callStatic.transferBatch(from, RECIPIENT, [0], [12], {
        from,
        gas: 30000000,
      });

      const [afterBalances] = await multiToken.callStatic.balanceOfBatch(
        [from, RECIPIENT],
        [0, 0]
      );

      assert.strictEqual(
        afterBalances[0].toString(10),
        beforeBalances[0].toString(10)
      );
      assert.strictEqual(
        afterBalances[1].toString(10),
        beforeBalances[1].toString(10)
      );
    });

    it("rejects batch balance queries with mismatched lengths", async function () {
      await expectRejects(() =>
        multiToken.callStatic.balanceOfBatch([from], [0, 0])
      );
    });
  });
});
