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
    const ERC1155_Game_Items = await ethers.getContractFactory('ERC1155_Game_Items');
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

    itemsContract = await ERC1155_Game_Items.deploy(forwarderAddress);

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
    expect(buyableItemOffer.items).to.equal(itemsContract.address);
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
    expect(sellableItemOffer.items).to.equal(itemsContract.address);
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

    expect(await seller.getBalance() * 1).to.be.above(sellerStartBalance) // 0.1 to account for gas.
    expect(await seller.provider.getBalance(merchantContract.address) * 1).to.equal(0);
    expect(await itemsContract.balanceOf(merchantContract.address, itemId) * 1).to.equal(1);
  });

  it('Fails to process buy offer when not approved to mint items and merchant does not own items to fulfill', async () => {

  });

  it('Fails to process sell offer when not approved to mint currency and merchant does not own tokens to fulfill', async () => {

  });

  it('Fails to process buy offer when max uses have been reached', async () => {

  });

  it('Fails to process sell offer when max uses have been reached', async () => {

  });

  it('Fails to process buy offer when sender does not have enough required token', async () => {

  });

  it('Fails to process sell offer when sender does not have required items', async () => {

  });

  it('Fails to set buyable and sellable offers when not owner', async () => {

  });

  it('Fails to remove buyable and sellable offers when not owner', async () => {

  });

  /*
   * Withdrawal Tests
   */

  it('Should withdraw native chain token', async () => {

  });

  it('Should withdraw erc20 currency tokens', async () => {

  });

  it('Should withdraw erc1155 items', async () => {

  });

  it('Fails to withdraw when not owner', async () => {

  });

  /*
   * Gasless Transaction Tests
   */

  it('Should cover spender gas fees when submitting transactions to forwarder', async () => {

  });

  it('Should properly upgrade trusted forwarder', async () => {

  });

  it('Fails to upgrade trusted forwarder if not owner', async () => {

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
