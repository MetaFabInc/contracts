const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = ethers;

const abiCoder = ethers.utils.defaultAbiCoder;

describe('Game_Items_Merchant', () => {
  let forwarderAddress;
  let forwarderContract;
  let tokenContract;
  let itemsContract;
  let merchantContract;
  let owner;
  let otherAddresses;

  beforeEach(async () => {
    const [ _owner, ..._otherAddresses ] = await ethers.getSigners();

    const ERC2771_Trusted_Forwarder = await ethers.getContractFactory('ERC2771_Trusted_Forwarder');
    const ERC20_Game_Currency = await ethers.getContractFactory('ERC20_Game_Currency');
    const ERC1155_Game_Items_Collection = await ethers.getContractFactory('ERC1155_Game_Items_Collection');
    const Game_Items_Merchant = await ethers.getContractFactory('Game_Items_Merchant');

    owner = _owner;
    otherAddresses = _otherAddresses;

    forwarderContract = await ERC2771_Trusted_Forwarder.deploy();
    forwarderAddress = forwarderContract.address;

    tokenContract = await ERC20_Game_Currency.deploy(
      "My Game Token",
      "MGT",
      getTokenDecimalAmount(1000000),
      forwarderAddress,
    );

    itemsContract = await ERC1155_Game_Items_Collection.deploy(forwarderAddress);

    merchantContract = await Game_Items_Merchant.deploy(forwarderAddress);
  });

  /*
   * General Tests
   */

  it('Should deploy', async () => {
    await forwarderContract.deployed();
    await tokenContract.deployed();
    await itemsContract.deployed();
    await merchantContract.deployed();
  });

  /*
   * Offer Tests
   */

  it('Should set buyable offer', async () => {
    const itemIds = [ 53, 45 ];
    const itemAmounts = [ 1, 64 ];
    const currencyAmount = getTokenDecimalAmount(100);

    await setItemOffer(
      'buyable',
      itemsContract.address,
      itemIds,
      itemAmounts,
      tokenContract.address,
      currencyAmount,
      0
    );

    const buyableItemOfferId = await merchantContract.buyableItemOfferIds(0);
    const buyableItemOffer = await merchantContract.getBuyableItemOffer(buyableItemOfferId);

    expect(buyableItemOffer.isActive).to.equal(true);
    expect(buyableItemOffer.currencyAmount * 1).to.equal(currencyAmount * 1);
    expect(buyableItemOffer.uses * 0).to.equal(0);
    expect(buyableItemOffer.maxUses * 0).to.equal(0);
    expect(buyableItemOffer.itemsCollection).to.equal(itemsContract.address);
    expect(buyableItemOffer.currency).to.equal(tokenContract.address);

    for(let i = 0; i < buyableItemOffer.itemIds; i++) {
      expect(buyableItemOffer.itemIds[i] * 1).to.equal(itemIds[i]);
    }

    for(let i = 0; i < buyableItemOffer.itemAmounts; i++) {
      expect(buyableItemOffer.itemAmounts[i] * 1).to.equal(itemAmounts[i]);
    }
  });

  it('Should set sellable offer', async () => {
    const itemIds = [ 2, 3 ];
    const itemAmounts = [ 1, 1 ];
    const currencyAmount = getTokenDecimalAmount(150);

    await setItemOffer(
      'sellable',
      itemsContract.address,
      itemIds,
      itemAmounts,
      tokenContract.address,
      currencyAmount,
      0
    );

    const sellableItemOfferId = await merchantContract.sellableItemOfferIds(0);
    const sellableItemOffer = await merchantContract.getSellableItemOffer(sellableItemOfferId);

    expect(sellableItemOffer.isActive).to.equal(true);
    expect(sellableItemOffer.currencyAmount * 1).to.equal(currencyAmount * 1);
    expect(sellableItemOffer.uses * 0).to.equal(0);
    expect(sellableItemOffer.maxUses * 0).to.equal(0);
    expect(sellableItemOffer.itemsCollection).to.equal(itemsContract.address);
    expect(sellableItemOffer.currency).to.equal(tokenContract.address);

    for(let i = 0; i < sellableItemOffer.itemIds; i++) {
      expect(sellableItemOffer.itemIds[i] * 1).to.equal(itemIds[i]);
    }

    for(let i = 0; i < sellableItemOffer.itemAmounts; i++) {
      expect(sellableItemOffer.itemAmounts[i] * 1).to.equal(itemAmounts[i]);
    }
  });

  it('Should paginate buyable offers', async () => {
    const totalOffers = 10;

    for(let i = 0; i < totalOffers; i++) {
      await setGenericItemOffer('buyable', getTokenDecimalAmount(10), 0);
    }

    await new Promise(resolve => setTimeout(resolve, 500)); // wait
    const offers = await merchantContract.paginateBuyableItemOffers(0, 15); // pagination should not overflow, 15 used to test

    expect(offers.length).to.equal(totalOffers);

    for (let i = 0; i < totalOffers; i++) {
      expect(offers[i].isActive).to.equal(true);
    }
  });

  it('Should paginate sellable offers', async () => {
    const totalOffers = 7;

    for(let i = 0; i < totalOffers; i++) {
      await setGenericItemOffer('sellable', getTokenDecimalAmount(10), 0);
    }

    const offers = await merchantContract.paginateSellableItemOffers(0, 15); // pagination should not overflow, 15 used to test

    expect(offers.length).to.equal(totalOffers);

    for (let i = 0; i < totalOffers; i++) {
      expect(offers[i].isActive).to.equal(true);
    }
  });

  it ('Should remove buyable offers', async () => {
    await setGenericItemOffer('buyable', getTokenDecimalAmount(10), 0);

    const itemOfferId = await merchantContract.buyableItemOfferIds(0);

    expect((await merchantContract.getBuyableItemOffer(itemOfferId)).isActive).to.equal(true);

    await merchantContract.removeBuyableItemOffer(itemOfferId);

    expect((await merchantContract.getBuyableItemOffer(itemOfferId)).isActive).to.equal(false);

    expect((await merchantContract.allBuyableItemOfferIds()).length).to.equal(1);
  })

  it('Should remove sellable offers', async () => {
    await setGenericItemOffer('sellable', getTokenDecimalAmount(10), 0);

    const itemOfferId = await merchantContract.sellableItemOfferIds(0);

    expect((await merchantContract.getSellableItemOffer(itemOfferId)).isActive).to.equal(true);

    await merchantContract.removeSellableItemOffer(itemOfferId);

    expect((await merchantContract.getSellableItemOffer(itemOfferId)).isActive).to.equal(false);

    expect((await merchantContract.allSellableItemOfferIds()).length).to.equal(1);
  });

  it('Should generate item offer ids ', async () => {
    const itemOfferId = await merchantContract.generateItemOfferId(
      itemsContract.address,
      tokenContract.address,
      [ 1 ],
    );

    expect(itemOfferId.length).to.not.equal(0);
  });

  it('Should process buy offer that mints items and increment uses', async () => {
    const itemPrice = getTokenDecimalAmount(10);

    await setGenericItemOffer('buyable', itemPrice, 0, true);

    const buyer = otherAddresses[0];
    const offerId = await merchantContract.buyableItemOfferIds(0);
    const offer = await merchantContract.getBuyableItemOffer(offerId);

    await tokenContract.mint(buyer.address, itemPrice);
    await tokenContract.connect(buyer).approve(merchantContract.address, itemPrice);
    await merchantContract.connect(buyer).buy(offerId);

    expect(await tokenContract.balanceOf(buyer.address) * 1).to.equal(0);
    expect(await tokenContract.balanceOf(merchantContract.address) * 1).to.equal(itemPrice * 1);
    expect((await merchantContract.getBuyableItemOffer(offerId)).uses).to.equal(1);
    expect(await itemsContract.balanceOf(buyer.address, offer.itemIds[0]) * 1).to.equal(1);
  });

  it('Should process buy offer that transfers items', async () => {
    const itemPrice = getTokenDecimalAmount(10);

    await setGenericItemOffer('buyable', itemPrice, 0, false);

    const buyer = otherAddresses[0];
    const offerId = await merchantContract.buyableItemOfferIds(0);
    const offer = await merchantContract.getBuyableItemOffer(offerId);
    const itemId = offer.itemIds[0];

    await tokenContract.mint(buyer.address, itemPrice);
    await tokenContract.connect(buyer).approve(merchantContract.address, itemPrice);
    await itemsContract.mintToAddress(merchantContract.address, itemId, 1);
    await merchantContract.connect(buyer).buy(offerId);

    expect(await tokenContract.balanceOf(buyer.address) * 1).to.equal(0);
    expect(await tokenContract.balanceOf(merchantContract.address) * 1).to.equal(itemPrice * 1);
    expect(await itemsContract.balanceOf(buyer.address, itemId) * 1).to.equal(1);
    expect(await itemsContract.balanceOf(merchantContract.address, itemId) * 1).to.equal(0);
    expect((await merchantContract.getBuyableItemOffer(offerId)).uses).to.equal(1);
  });

  it('Should process sell offer that mints currency and increment uses', async () => {
    const sellPrice = getTokenDecimalAmount(15);

    await setGenericItemOffer('sellable', sellPrice, 0, true);

    const seller = otherAddresses[0];
    const offerId = await merchantContract.sellableItemOfferIds(0);
    const offer = await merchantContract.getSellableItemOffer(offerId);
    const itemId = offer.itemIds[0];

    await itemsContract.mintToAddress(seller.address, itemId, 1);
    await itemsContract.connect(seller).setApprovalForAll(merchantContract.address, true);
    await merchantContract.connect(seller).sell(offerId);

    expect(await itemsContract.balanceOf(seller.address, itemId) * 1).to.equal(0);
    expect(await itemsContract.balanceOf(merchantContract.address, itemId) * 1).to.equal(1);
    expect((await merchantContract.getSellableItemOffer(offerId)).uses).to.equal(1);
    expect(await tokenContract.balanceOf(seller.address) * 1).to.equal(sellPrice * 1);
  });

  it('Should process sell offer that transfers currency', async () => {
    const sellPrice = getTokenDecimalAmount(15);

    await setGenericItemOffer('sellable', sellPrice, 0, false);

    const seller = otherAddresses[0];
    const offerId = await merchantContract.sellableItemOfferIds(0);
    const offer = await merchantContract.getSellableItemOffer(offerId);
    const itemId = offer.itemIds[0];

    await itemsContract.mintToAddress(seller.address, itemId, 1);
    await itemsContract.connect(seller).setApprovalForAll(merchantContract.address, true);
    await tokenContract.mint(merchantContract.address, sellPrice);
    await merchantContract.connect(seller).sell(offerId);

    expect(await itemsContract.balanceOf(seller.address, itemId) * 1).to.equal(0);
    expect(await itemsContract.balanceOf(merchantContract.address, itemId) * 1).to.equal(1);
    expect(await tokenContract.balanceOf(seller.address) * 1).to.equal(sellPrice * 1);
    expect(await tokenContract.balanceOf(merchantContract.address) * 1).to.equal(0);
    expect((await merchantContract.getSellableItemOffer(offerId)).uses).to.equal(1);
  });

  it('Should process buy offer using native chain token', async () => {
    const itemPrice = getTokenDecimalAmount(2);
    const itemId = 3;

    await setItemOffer(
      'buyable',
      itemsContract.address,
      [ itemId ],
      [ 1 ],
      ethers.constants.AddressZero,
      itemPrice,
      0,
      true,
    );

    const buyer = otherAddresses[0];
    const buyerStartBalance = await buyer.getBalance() * 1; // 10000~
    const offerId = await merchantContract.buyableItemOfferIds(0);

    await merchantContract.connect(buyer).buy(offerId, {
      value: itemPrice,
    });

    expect(await buyer.getBalance() * 1).to.be.below(buyerStartBalance - itemPrice * 1); // less price + gas
    expect(await buyer.provider.getBalance(merchantContract.address) * 1).to.equal(itemPrice * 1);
    expect(await itemsContract.balanceOf(buyer.address, itemId) * 1).to.equal(1);
  });

  it('Should process sell offer using native chain token', async () => {
    const sellPrice = getTokenDecimalAmount(2);
    const itemId = 3;

    await setItemOffer(
      'sellable',
      itemsContract.address,
      [ itemId ],
      [ 1 ],
      ethers.constants.AddressZero,
      sellPrice,
      0,
      false,
    );

    const seller = otherAddresses[0];
    const sellerStartBalance = await seller.getBalance() * 1; // 10000~
    const offerId = await merchantContract.sellableItemOfferIds(0);

    // fund merchant
    await owner.sendTransaction({
      to: merchantContract.address,
      value: ethers.utils.parseEther('2.0'),
    });

    await itemsContract.mintToAddress(seller.address, itemId, 1);
    await itemsContract.connect(seller).setApprovalForAll(merchantContract.address, true);
    await merchantContract.connect(seller).sell(offerId);

    expect(await seller.getBalance() * 1).to.be.above(sellerStartBalance);
    expect(await seller.provider.getBalance(merchantContract.address) * 1).to.equal(0);
    expect(await itemsContract.balanceOf(merchantContract.address, itemId) * 1).to.equal(1);
  });

  it('Fails to process buy offer when not approved to mint items and merchant does not own items to fulfill', async () => {
    const itemPrice = getTokenDecimalAmount(10);

    await setGenericItemOffer('buyable', itemPrice, 0, false);

    const buyer = otherAddresses[0];
    const offerId = await merchantContract.buyableItemOfferIds(0);
    const offer = await merchantContract.getBuyableItemOffer(offerId);
    const itemId = offer.itemIds[0];

    await tokenContract.mint(buyer.address, itemPrice);
    await tokenContract.connect(buyer).approve(merchantContract.address, itemPrice);
    await expect(merchantContract.connect(buyer).buy(offerId)).to.be.reverted;
  });

  it('Fails to process sell offer when not approved to mint currency and merchant does not own tokens to fulfill', async () => {
    const sellPrice = getTokenDecimalAmount(15);

    await setGenericItemOffer('sellable', sellPrice, 0, false);

    const seller = otherAddresses[0];
    const offerId = await merchantContract.sellableItemOfferIds(0);
    const offer = await merchantContract.getSellableItemOffer(offerId);
    const itemId = offer.itemIds[0];

    await itemsContract.mintToAddress(seller.address, itemId, 1);
    await itemsContract.connect(seller).setApprovalForAll(merchantContract.address, true);
    await expect(merchantContract.connect(seller).sell(offerId)).to.be.reverted;
  });

  it('Fails to process buy offer when max uses have been reached', async () => {
    const itemPrice = getTokenDecimalAmount(10);

    await setGenericItemOffer('buyable', itemPrice, 1, true);

    const buyer = otherAddresses[0];
    const offerId = await merchantContract.buyableItemOfferIds(0);
    const offer = await merchantContract.getBuyableItemOffer(offerId);
    const itemId = offer.itemIds[0];

    await tokenContract.mint(buyer.address, itemPrice.mul(2));
    await tokenContract.connect(buyer).approve(merchantContract.address, itemPrice);
    await merchantContract.connect(buyer).buy(offerId);
    await expect(merchantContract.connect(buyer).buy(offerId)).to.be.reverted; // single use
  });

  it('Fails to process sell offer when max uses have been reached', async () => {
    const sellPrice = getTokenDecimalAmount(15);

    await setGenericItemOffer('sellable', sellPrice, 1, true);

    const seller = otherAddresses[0];
    const offerId = await merchantContract.sellableItemOfferIds(0);
    const offer = await merchantContract.getSellableItemOffer(offerId);
    const itemId = offer.itemIds[0];

    await itemsContract.mintToAddress(seller.address, itemId, 2);
    await itemsContract.connect(seller).setApprovalForAll(merchantContract.address, true);
    await merchantContract.connect(seller).sell(offerId);
    await expect(merchantContract.connect(seller).sell(offerId)).to.be.reverted;
  });

  it('Fails to process buy offer when sender does not have enough required token', async () => {
    const itemPrice = getTokenDecimalAmount(10);

    await setGenericItemOffer('buyable', itemPrice, 1, true);

    const buyer = otherAddresses[0];
    const offerId = await merchantContract.buyableItemOfferIds(0);
    const offer = await merchantContract.getBuyableItemOffer(offerId);
    const itemId = offer.itemIds[0];

    await tokenContract.connect(buyer).approve(merchantContract.address, itemPrice);
    await expect(merchantContract.connect(buyer).buy(offerId)).to.be.reverted;
  });

  it('Fails to process sell offer when sender does not have required items', async () => {
    const sellPrice = getTokenDecimalAmount(15);

    await setGenericItemOffer('sellable', sellPrice, 1, true);

    const seller = otherAddresses[0];
    const offerId = await merchantContract.sellableItemOfferIds(0);
    const offer = await merchantContract.getSellableItemOffer(offerId);
    const itemId = offer.itemIds[0];

    await itemsContract.connect(seller).setApprovalForAll(merchantContract.address, true);
    await expect(merchantContract.connect(seller).sell(offerId)).to.be.reverted;
  });

  it('Fails to set buyable and sellable offers when not owner', async () => {
    const args = [
      itemsContract.address,
      [ 1 ],
      [ 1 ],
      tokenContract.address,
      getTokenDecimalAmount(1),
      0,
    ];

    await expect(merchantContract.connect(otherAddresses[0]).setBuyableItemOffer(...args)).to.be.reverted;
    await expect(merchantContract.connect(otherAddresses[0]).setSellableItemOffer(...args)).to.be.reverted;
  });

  it('Fails to remove buyable and sellable offers when not owner', async () => {
    await setGenericItemOffer('buyable', getTokenDecimalAmount(1), 0, true);
    await setGenericItemOffer('sellable', getTokenDecimalAmount(1), 0, true);

    const buyableItemOfferId = merchantContract.buyableItemOfferIds(0);
    const sellableItemOfferId = merchantContract.sellableItemOfferIds(0);

    await expect(merchantContract.connect(otherAddresses[0]).removeBuyableItemOffer(buyableItemOfferId)).to.be.reverted;
    await expect(merchantContract.connect(otherAddresses[0]).removeSellableItemOffer(sellableItemOfferId)).to.be.reverted;
  });

  /*
   * Withdrawal Tests
   */

  it('Should withdraw native chain token', async () => {
    const depositAmount = getTokenDecimalAmount(150);
    const ownerStartBalance = await owner.getBalance();

    await otherAddresses[0].sendTransaction({
      to: merchantContract.address,
      value: depositAmount,
    });

    expect(await owner.provider.getBalance(merchantContract.address) * 1).to.equal(depositAmount * 1);

    await merchantContract.withdrawTo(owner.address);

    expect(await owner.provider.getBalance(merchantContract.address) * 1).to.equal(0);
    expect(await owner.getBalance() * 1).to.be.above(ownerStartBalance * 1);
  });

  it('Should withdraw erc20 currency tokens', async () => {
    const depositAmount = getTokenDecimalAmount(175);

    await tokenContract.mint(merchantContract.address, depositAmount);
    expect(await tokenContract.balanceOf(merchantContract.address) * 1).to.equal(depositAmount * 1);
    await merchantContract.withdrawCurrencyTo(tokenContract.address, owner.address);
    expect(await tokenContract.balanceOf(merchantContract.address) * 1).to.equal(0);
    expect(await tokenContract.balanceOf(owner.address) * 1).to.equal(depositAmount * 1);
  });

  it('Should withdraw erc1155 items', async () => {
    const itemIds = [ 3, 4 ];

    await itemsContract.mintBatchToAddress(merchantContract.address, itemIds, [ 1, 1 ]);
    expect(await itemsContract.balanceOf(merchantContract.address, itemIds[0])).to.equal(1);
    expect(await itemsContract.balanceOf(merchantContract.address, itemIds[1])).to.equal(1);
    await merchantContract.withdrawItemsTo(itemsContract.address, itemIds, owner.address);
    expect(await itemsContract.balanceOf(merchantContract.address, itemIds[0])).to.equal(0);
    expect(await itemsContract.balanceOf(merchantContract.address, itemIds[1])).to.equal(0);
    expect(await itemsContract.balanceOf(owner.address, itemIds[0])).to.equal(1);
    expect(await itemsContract.balanceOf(owner.address, itemIds[1])).to.equal(1);
  });

  it('Fails to withdraw when not owner', async () => {
    await otherAddresses[0].sendTransaction({
      to: merchantContract.address,
      value: getTokenDecimalAmount(100),
    });

    await tokenContract.mint(merchantContract.address, getTokenDecimalAmount(175));

    await itemsContract.mintBatchToAddress(merchantContract.address, [ 3 ], [ 1 ]);

    await expect(merchantContract.connect(otherAddresses[0]).withdrawTo(owner.address)).to.be.reverted;
    await expect(merchantContract.connect(otherAddresses[0]).withdrawCurrencyTo(tokenContract.address, owner.address)).to.be.reverted;
    await expect(merchantContract.connect(otherAddresses[0]).withdrawItemsTo(itemsContract.address, [ 3 ], owner.address)).to.be.reverted;
  });

  /*
   * Gasless Transaction Tests
   */

  it('Should cover spender gas fees when submitting transactions to forwarder', async () => {
    const chainId = 31337; // hardhat
    const sender = otherAddresses[1];
    const recipient = otherAddresses[2];

    await setGenericItemOffer('buyable', getTokenDecimalAmount(10), 0, true);
    await tokenContract.mint(sender.address, getTokenDecimalAmount(10));
    await tokenContract.connect(sender).approve(merchantContract.address, getTokenDecimalAmount(10));

    const offerId = await merchantContract.buyableItemOfferIds(0);
    const offer = await merchantContract.getBuyableItemOffer(offerId);
    const itemId = offer.itemIds[0];


    // create request object
    const data = [ offerId ];
    const gasEstimate = await merchantContract.connect(sender).estimateGas.buy(offerId);
    const callData = merchantContract.interface.encodeFunctionData('buy', data);
    const forwardRequest = {
      from: sender.address,
      to: merchantContract.address,
      value: getTokenDecimalAmount(0),
      gas: gasEstimate,
      nonce: 41,
      data: callData,
    };

    // sign message
    const domain = {
      chainId,
      name: 'ERC2771_Trusted_Forwarder',
      verifyingContract: forwarderContract.address,
      version: '1.0.0',
    };

    const types = {
      ForwardRequest: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'gas', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'data', type: 'bytes' },
      ],
    };

    const signature = await sender._signTypedData(domain, types, forwardRequest);

    // execute request
    const externalAccount = owner;
    const startingExternalAccountBalance = await externalAccount.getBalance() * 1;

    expect(await itemsContract.balanceOf(sender.address, itemId)).to.equal(0);
    await forwarderContract.connect(externalAccount).execute(forwardRequest, signature);
    expect(await externalAccount.getBalance() * 1).to.be.below(startingExternalAccountBalance);
    expect(await itemsContract.balanceOf(sender.address, itemId)).to.equal(1);

    // attempt to re-execute request one, it should fail since the nonce is used
    await expect(
      forwarderContract.connect(externalAccount).execute(
        forwardRequest,
        signature,
      )
    ).to.be.reverted;
  });

  it('Should properly upgrade trusted forwarder', async () => {
    await merchantContract.upgradeTrustedForwarder(otherAddresses[1].address);
    expect(await merchantContract.isTrustedForwarder(otherAddresses[1].address)).to.equal(true);
  });

  it('Fails to upgrade trusted forwarder if not owner', async () => {
    await expect(merchantContract.connect(otherAddresses[0]).upgradeTrustedForwarder(
      otherAddresses[1].address,
    )).to.be.reverted;
  });

  /**
   * Helpers
   */

  async function setItemOffer(type, itemsAddress, itemIds, itemAmounts, currencyAddress, currencyAmount, maxUses, canMint = false) {
    let setOfferFunc;

    if (type === 'buyable') {
      setOfferFunc = merchantContract.setBuyableItemOffer;

      if (canMint) {
        await itemsContract.grantRole(ethers.utils.id("METAFAB_MINTER_ROLE"), merchantContract.address);
      }
    } else {
      setOfferFunc = merchantContract.setSellableItemOffer;

      if (canMint) {
        await tokenContract.grantRole(ethers.utils.id("METAFAB_MINTER_ROLE"), merchantContract.address);
      }
    }

    return setOfferFunc(
      itemsAddress,
      itemIds,
      itemAmounts,
      currencyAddress,
      currencyAmount,
      maxUses,
    );
  }

  async function setGenericItemOffer(type, currencyAmount, maxUses, canMint) {
    return setItemOffer(
      type,
      itemsContract.address,
      [ Math.floor(Math.random() * 1000) ],
      [ 1 ],
      tokenContract.address,
      currencyAmount,
      maxUses,
      canMint,
    );
  }

  async function mintItemToAddress(toAddress, itemId, quantity) {
    return itemsContract.connect(owner).mintToAddress(toAddress, itemId, quantity);
  }

  function getTokenDecimalAmount(amount) {
    return BigNumber.from(BigInt(amount * 1e18));
  }
});
