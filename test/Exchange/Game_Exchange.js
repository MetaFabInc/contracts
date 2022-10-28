const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = ethers;

const abiCoder = ethers.utils.defaultAbiCoder;

const ENUM_BUYABLE_OFFER = 1;
const ENUM_SELLABLE_OFFER = 2

describe('Game_Exchange', () => {
  let forwarderAddress;
  let forwarderContract;
  let tokenContract;
  let itemsContract;
  let exchangeContract;
  let owner;
  let otherAddresses;

  beforeEach(async () => {
    const [ _owner, ..._otherAddresses ] = await ethers.getSigners();

    const ERC2771_Trusted_Forwarder = await ethers.getContractFactory('ERC2771_Trusted_Forwarder');
    const ERC20_Game_Currency = await ethers.getContractFactory('ERC20_Game_Currency');
    const ERC1155_Game_Items_Collection = await ethers.getContractFactory('ERC1155_Game_Items_Collection');
    const Game_Exchange = await ethers.getContractFactory('Game_Exchange');

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

    exchangeContract = await Game_Exchange.deploy(forwarderAddress);
  });

  /*
   * General Tests
   */

  it('Should deploy', async () => {
    await forwarderContract.deployed();
    await tokenContract.deployed();
    await itemsContract.deployed();
    await exchangeContract.deployed();
  });

  /*
   * Offer Tests
   */

  it('Should set offer that requires currency and gives items', async () => {
    const outputCollectionItemIds = [ 53, 45 ];
    const outputCollectionItemAmounts = [ 1, 64 ];
    const inputCurrencyAmount = getTokenDecimalAmount(100);
    const offerId = 123;

    await setOffer({
      offerId,
      inputCurrency: tokenContract.address,
      inputCurrencyAmount,
      outputCollection: itemsContract.address,
      outputCollectionItemIds,
      outputCollectionItemAmounts,
      canMint: true,
    });

    const offer = await exchangeContract.offer(offerId);

    expect(offer.id * 1).to.equal(offerId);
    expect(offer.inputCurrencyAmount * 1).to.equal(inputCurrencyAmount * 1);
    expect(offer.uses * 1).to.equal(0);
    expect(offer.maxUses * 1).to.equal(0);
    expect(offer.lastUpdatedAt * 1).to.not.equal(0);
    expect(offer.outputCollection).to.equal(itemsContract.address);
    expect(offer.inputCurrency).to.equal(tokenContract.address);

    for(let i = 0; i < offer.outputCollectionItemIds.length; i++) {
      expect(offer.outputCollectionItemIds[i] * 1).to.equal(outputCollectionItemIds[i]);
    }

    for(let i = 0; i < offer.outputCollectionItemAmounts.length; i++) {
      expect(offer.outputCollectionItemAmounts[i] * 1).to.equal(outputCollectionItemAmounts[i]);
    }
  });

  it('Should set offer that requires items and gives currency', async () => {
    const inputCollectionItemIds = [ 53, 45 ];
    const inputCollectionItemAmounts = [ 1, 64 ];
    const outputCurrencyAmount = getTokenDecimalAmount(100);
    const offerId = 123;

    await setOffer({
      offerId,
      inputCollection: itemsContract.address,
      inputCollectionItemIds,
      inputCollectionItemAmounts,
      outputCurrency: tokenContract.address,
      outputCurrencyAmount,
      canMint: true,
    });

    const offer = await exchangeContract.offer(offerId);

    expect(offer.id * 1).to.equal(offerId);
    expect(offer.outputCurrencyAmount * 1).to.equal(outputCurrencyAmount * 1);
    expect(offer.uses * 1).to.equal(0);
    expect(offer.maxUses * 1).to.equal(0);
    expect(offer.lastUpdatedAt * 1).to.not.equal(0);
    expect(offer.inputCollection).to.equal(itemsContract.address);
    expect(offer.outputCurrency).to.equal(tokenContract.address);

    for(let i = 0; i < offer.inputCollectionItemIds.length; i++) {
      expect(offer.inputCollectionItemIds[i] * 1).to.equal(inputCollectionItemIds[i]);
    }

    for(let i = 0; i < offer.inputCollectionItemAmounts.length; i++) {
      expect(offer.inputCollectionItemAmounts[i] * 1).to.equal(inputCollectionItemAmounts[i]);
    }
  });

  it('Should set offer that requires items and gives items', async () => {
    const inputCollectionItemIds = [ 53, 45 ];
    const inputCollectionItemAmounts = [ 1, 64 ];
    const outputCollectionItemIds = [ 11 ];
    const outputCollectionItemAmounts = [ 5 ];
    const offerId = 126;

    await setOffer({
      offerId,
      inputCollection: itemsContract.address,
      inputCollectionItemIds,
      inputCollectionItemAmounts,
      outputCollection: itemsContract.address,
      outputCollectionItemIds,
      outputCollectionItemAmounts,
      canMint: true,
    });

    const offer = await exchangeContract.offer(offerId);

    expect(offer.id * 1).to.equal(offerId);
    expect(offer.uses * 1).to.equal(0);
    expect(offer.maxUses * 1).to.equal(0);
    expect(offer.lastUpdatedAt * 1).to.not.equal(0);
    expect(offer.inputCollection).to.equal(itemsContract.address);
    expect(offer.outputCollection).to.equal(itemsContract.address);

    for(let i = 0; i < offer.inputCollectionItemIds.length; i++) {
      expect(offer.inputCollectionItemIds[i] * 1).to.equal(inputCollectionItemIds[i]);
    }

    for(let i = 0; i < offer.inputCollectionItemAmounts.length; i++) {
      expect(offer.inputCollectionItemAmounts[i] * 1).to.equal(inputCollectionItemAmounts[i]);
    }

    for(let i = 0; i < offer.outputCollectionItemIds.length; i++) {
      expect(offer.outputCollectionItemIds[i] * 1).to.equal(outputCollectionItemIds[i]);
    }

    for(let i = 0; i < offer.outputCollectionItemAmounts.length; i++) {
      expect(offer.outputCollectionItemAmounts[i] * 1).to.equal(outputCollectionItemAmounts[i]);
    }
  });

  it('Should paginate offers, offerIds, offerLastUpdates', async () => {
    const totalOffers = 10;

    for(let i = 0; i < totalOffers; i++) {
      await setGenericOffer({
        offerId: i,
        inputCollectionItemIds: i > 5 ? [ i * 2, 22 ] : [],
        inputCurrencyAmount: i > 5 ? 0 : getTokenDecimalAmount(5),
        outputCollectionItemIds: i > 5 ? [] : [ i * 7 ],
        outputCurrencyAmount: i > 5 ? getTokenDecimalAmount(10) : 0,
        canMint: true,
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500)); // wait
    const offers = await exchangeContract.paginateOffers(0, 15); // pagination should not overflow, 15 used to test

    // offers
    expect(offers.length).to.equal(totalOffers);

    for (let i = 0; i < totalOffers; i++) {
      expect(offers[i].id * 1).to.equal(i);
    }

    // offer ids
    const offerIds = await exchangeContract.paginateOfferIds(0, 15);

    expect(offerIds.length).to.equal(totalOffers);

    for (let i = 0; i < totalOffers; i++) {
      expect(offerIds[i] * 1).to.equal(i);
    }

    // offer last updates
    const offerLastUpdates = await exchangeContract.paginateOfferLastUpdates(0, 15);

    expect(offerIds.length).to.equal(totalOffers);

    for (let i = 0; i < totalOffers; i++) {
      expect(offerLastUpdates[i].length).to.equal(2);
    }
  });

  it ('Should remove offers', async () => {
    const offerId = 585;

    await setGenericOffer({
      offerId,
      inputCurrencyAmount: getTokenDecimalAmount(5),
      outputCollectionItemIds: [ 22, 53 ],
      canMint: true,
    });

    expect((await exchangeContract.offer(offerId)).id * 1).to.equal(offerId);

    await exchangeContract.removeOffer(offerId);

    expect(await exchangeContract.totalOffers() * 1).to.equal(0)

    await expect(exchangeContract.offer(offerId)).to.be.reverted;
  });

  it('Should process offer that requires currency and give/mints items and increment uses', async () => {
    const itemPrice = getTokenDecimalAmount(10);

    const offerId = 55563;

    await setGenericOffer({
      offerId,
      inputCurrencyAmount: itemPrice,
      outputCollectionItemIds: [ 22, 53 ],
      canMint: true,
    });

    const user = otherAddresses[0];
    const offer = await exchangeContract.offer(offerId);

    await tokenContract.mint(user.address, itemPrice);
    await tokenContract.connect(user).approve(exchangeContract.address, itemPrice);
    await exchangeContract.connect(user).useOffer(offerId);

    expect(await tokenContract.balanceOf(user.address) * 1).to.equal(0);
    expect(await tokenContract.balanceOf(exchangeContract.address) * 1).to.equal(itemPrice * 1);
    expect((await exchangeContract.offer(offerId)).uses).to.equal(1);
    expect(await itemsContract.balanceOf(user.address, offer.outputCollectionItemIds[0]) * 1).to.equal(1);
    expect(await itemsContract.balanceOf(user.address, offer.outputCollectionItemIds[1]) * 1).to.equal(1);
  });

  it('Should process offer that gives/transfers items', async () => {
    const itemPrice = getTokenDecimalAmount(10);
    const offerId = 76799;

    await setGenericOffer({
      offerId,
      inputCurrencyAmount: itemPrice,
      outputCollectionItemIds: [ 1 ],
      canMint: false,
    });

    const user = otherAddresses[0];
    const offer = await exchangeContract.offer(offerId);
    const itemId = offer.outputCollectionItemIds[0];

    await tokenContract.mint(user.address, itemPrice);
    await tokenContract.connect(user).approve(exchangeContract.address, itemPrice);
    await itemsContract.mintToAddress(exchangeContract.address, itemId, 1);
    await exchangeContract.connect(user).useOffer(offerId);

    expect(await tokenContract.balanceOf(user.address) * 1).to.equal(0);
    expect(await tokenContract.balanceOf(exchangeContract.address) * 1).to.equal(itemPrice * 1);
    expect(await itemsContract.balanceOf(user.address, itemId) * 1).to.equal(1);
    expect(await itemsContract.balanceOf(exchangeContract.address, itemId) * 1).to.equal(0);
    expect((await exchangeContract.offer(offerId)).uses).to.equal(1);
  });

  it('Should process offer that requires items and mints/gives currency and increment uses', async () => {
    const sellPrice = getTokenDecimalAmount(15);
    const offerId = 995532;

    await setGenericOffer({
      offerId,
      outputCurrencyAmount: sellPrice,
      inputCollectionItemIds: [ 1 ],
      canMint: true,
    });

    const user = otherAddresses[0];
    const offer = await exchangeContract.offer(offerId);
    const itemId = offer.inputCollectionItemIds[0];

    await itemsContract.mintToAddress(user.address, itemId, 1);
    await itemsContract.connect(user).setApprovalForAll(exchangeContract.address, true);
    await exchangeContract.connect(user).useOffer(offerId);

    expect(await itemsContract.balanceOf(user.address, itemId) * 1).to.equal(0);
    expect(await itemsContract.balanceOf(exchangeContract.address, itemId) * 1).to.equal(1);
    expect((await exchangeContract.offer(offerId)).uses).to.equal(1);
    expect(await tokenContract.balanceOf(user.address) * 1).to.equal(sellPrice * 1);
  });

  it('Should process offer that requires items and transfers/gives currency', async () => {
    const sellPrice = getTokenDecimalAmount(15);
    const offerId = 43;

    await setGenericOffer({
      offerId,
      outputCurrencyAmount: sellPrice,
      inputCollectionItemIds: [ 1 ],
      canMint: false,
    });

    const user = otherAddresses[0];
    const offer = await exchangeContract.offer(offerId);
    const itemId = offer.inputCollectionItemIds[0];

    await itemsContract.mintToAddress(user.address, itemId, 1);
    await itemsContract.connect(user).setApprovalForAll(exchangeContract.address, true);
    await tokenContract.mint(exchangeContract.address, sellPrice);
    await exchangeContract.connect(user).useOffer(offerId);

    expect(await itemsContract.balanceOf(user.address, itemId) * 1).to.equal(0);
    expect(await itemsContract.balanceOf(exchangeContract.address, itemId) * 1).to.equal(1);
    expect(await tokenContract.balanceOf(user.address) * 1).to.equal(sellPrice * 1);
    expect(await tokenContract.balanceOf(exchangeContract.address) * 1).to.equal(0);
    expect((await exchangeContract.offer(offerId)).uses).to.equal(1);
  });

  it('Should process offer that requires items and mints/gives items', async () => {
    const offerId = 43;

    await setGenericOffer({
      offerId,
      inputCollectionItemIds: [ 1, 2 ],
      outputCollectionItemIds: [ 3 ],
      canMint: true,
    });

    const user = otherAddresses[0];
    const offer = await exchangeContract.offer(offerId);
    const inputItemIdOne = offer.inputCollectionItemIds[0];
    const inputItemIdTwo = offer.inputCollectionItemIds[1];
    const outputItemId = offer.outputCollectionItemIds[0];

    await itemsContract.mintToAddress(user.address, inputItemIdOne, 1);
    await itemsContract.mintToAddress(user.address, inputItemIdTwo, 1);
    await itemsContract.connect(user).setApprovalForAll(exchangeContract.address, true);
    await exchangeContract.connect(user).useOffer(offerId);

    expect(await itemsContract.balanceOf(user.address, inputItemIdOne) * 1).to.equal(0);
    expect(await itemsContract.balanceOf(user.address, inputItemIdTwo) * 1).to.equal(0);
    expect(await itemsContract.balanceOf(user.address, outputItemId) * 1).to.equal(1);
    expect((await exchangeContract.offer(offerId)).uses).to.equal(1);
  });

  it('Should process offer requiring native chain token', async () => {
    const itemPrice = getTokenDecimalAmount(5);
    const itemId = 3;
    const offerId = 542;

    await setOffer({
      offerId,
      inputCurrencyAmount: itemPrice,
      outputCollection: itemsContract.address,
      outputCollectionItemIds: [ itemId ],
      outputCollectionItemAmounts: [ 1 ],
      canMint: true,
    });

    const user = otherAddresses[0];
    const userStartBalance = await user.getBalance() * 1; // 10000~

    await exchangeContract.connect(user).useOffer(offerId, {
      value: itemPrice,
    });

    expect(await user.getBalance() * 1).to.be.below(userStartBalance - itemPrice * 1); // less price + gas
    expect(await user.provider.getBalance(exchangeContract.address) * 1).to.equal(itemPrice * 1);
    expect(await itemsContract.balanceOf(user.address, itemId) * 1).to.equal(1);
  });

  it('Should process offer receiving native chain token', async () => {
    const sellPrice = getTokenDecimalAmount(2);
    const itemId = 3;
    const offerId = 765;

    await setOffer({
      offerId,
      inputCollection: itemsContract.address,
      inputCollectionItemIds: [ itemId ],
      inputCollectionItemAmounts: [ 1 ],
      outputCurrencyAmount: sellPrice,
      canMint: true,
    });

    const user = otherAddresses[0];
    const userStartBalance = await user.getBalance() * 1; // 10000~

    // fund merchant
    await owner.sendTransaction({
      to: exchangeContract.address,
      value: ethers.utils.parseEther('2.0'),
    });

    await itemsContract.mintToAddress(user.address, itemId, 1);
    await itemsContract.connect(user).setApprovalForAll(exchangeContract.address, true);
    await exchangeContract.connect(user).useOffer(offerId);

    expect(await user.getBalance() * 1).to.be.above(userStartBalance);
    expect(await user.provider.getBalance(exchangeContract.address) * 1).to.equal(0);
    expect(await itemsContract.balanceOf(exchangeContract.address, itemId) * 1).to.equal(1);
  });

  it('Fails to use offer when not approved to mint items and merchant does not own items to fulfill', async () => {
    const itemPrice = getTokenDecimalAmount(10);
    const offerId = 8568;

    await setGenericOffer({
      offerId,
      inputCurrencyAmount: itemPrice,
      outputCollectionItemIds: [ 1 ],
      canMint: false,
    });

    const user = otherAddresses[0];
    const offer = await exchangeContract.offer(offerId);
    const itemId = offer.outputCollectionItemIds[0];

    await tokenContract.mint(user.address, itemPrice);
    await tokenContract.connect(user).approve(exchangeContract.address, itemPrice);
    await expect(exchangeContract.connect(user).useOffer(offerId)).to.be.reverted;
  });

  it('Fails to use offer when not approved to mint currency and merchant does not own tokens to fulfill', async () => {
    const itemPrice = getTokenDecimalAmount(15);
    const offerId = 99112;

    await setGenericOffer({
      offerId,
      inputCollectionItemIds: [ 1 ],
      outputCurrencyAmount: itemPrice,
      canMint: false,
    });

    const user = otherAddresses[0];
    const offer = await exchangeContract.offer(offerId);
    const itemId = offer.inputCollectionItemIds[0];

    await itemsContract.mintToAddress(user.address, itemId, 1);
    await itemsContract.connect(user).setApprovalForAll(exchangeContract.address, true);
    await expect(exchangeContract.connect(user).useOffer(offerId)).to.be.reverted;
  });

  it('Fails to use offer when max uses have been reached', async () => {
    const itemPrice = getTokenDecimalAmount(10);
    const offerId = 1010;

    await setOffer({
      offerId,
      inputCurrency: tokenContract.address,
      inputCurrencyAmount: itemPrice,
      outputCollection: itemsContract.address,
      outputCollectionItemIds: [ 5 ],
      outputCollectionItemAmounts: [ 1 ],
      canMint: true,
      maxUses: 1,
    });

    const user = otherAddresses[0];
    const offer = await exchangeContract.offer(offerId);
    const itemId = offer.outputCollectionItemIds[0];

    await tokenContract.mint(user.address, itemPrice.mul(2));
    await tokenContract.connect(user).approve(exchangeContract.address, itemPrice.mul(2));
    await exchangeContract.connect(user).useOffer(offerId);
    await expect(exchangeContract.connect(user).useOffer(offerId)).to.be.reverted; // single use
  });

  it('Fails to use offer when sender does not have enough input token', async () => {
    const itemPrice = getTokenDecimalAmount(10);
    const offerId = 33432;

    await setGenericOffer({
      offerId,
      inputCurrencyAmount: itemPrice,
      outputCollectionItemIds: [ 1 ],
      canMint: false,
    });

    const user = otherAddresses[0];
    const offer = await exchangeContract.offer(offerId);
    const itemId = offer.outputCollectionItemIds[0];

    await tokenContract.connect(user).approve(exchangeContract.address, itemPrice);
    await expect(exchangeContract.connect(user).useOffer(offerId)).to.be.reverted;
  });

  it('Fails to use offer when sender does not have input items', async () => {
    const itemPrice = getTokenDecimalAmount(15);
    const offerId = 5050;

    await setGenericOffer({
      offerId,
      inputCollectionItemIds: [ 1 ],
      outputCurrencyAmount: itemPrice,
      canMint: false,
    });

    const user = otherAddresses[0];
    const offer = await exchangeContract.offer(offerId);
    const itemId = offer.inputCollectionItemIds[0];

    await itemsContract.connect(user).setApprovalForAll(exchangeContract.address, true);
    await expect(exchangeContract.connect(user).useOffer(offerId)).to.be.reverted;
  });

  it('Fails to set buyable and sellable offers when not owner', async () => {
    const offerId = 5421;

    const args = [
      offerId,
      [ ethers.constants.AddressZero, itemsContract.address ],
      [ [], [ 1 ] ],
      [ [], [ 1 ] ],
      [ tokenContract.address, ethers.constants.AddressZero ],
      [ 0, 0 ],
      0,
    ];

    await expect(exchangeContract.connect(otherAddresses[0]).setOffer(...args)).to.be.reverted;
  });

  it('Fails to remove offers when not owner', async () => {
    const offerId  = 482;

    await setGenericOffer({
      offerId,
      inputCurrencyAmount: getTokenDecimalAmount(10),
      outputCollectionItemIds: [ 1 ],
      canMint: false,
    });

    await expect(exchangeContract.connect(otherAddresses[0]).removeOffer(offerId)).to.be.reverted;
  });

  /*
   * Withdrawal Tests
   */

  it('Should withdraw native chain token', async () => {
    const depositAmount = getTokenDecimalAmount(150);
    const ownerStartBalance = await owner.getBalance();

    await otherAddresses[0].sendTransaction({
      to: exchangeContract.address,
      value: depositAmount,
    });

    expect(await owner.provider.getBalance(exchangeContract.address) * 1).to.equal(depositAmount * 1);

    await exchangeContract.withdrawTo(owner.address);

    expect(await owner.provider.getBalance(exchangeContract.address) * 1).to.equal(0);
    expect(await owner.getBalance() * 1).to.be.above(ownerStartBalance * 1);
  });

  it('Should withdraw erc20 currency tokens', async () => {
    const depositAmount = getTokenDecimalAmount(175);

    await tokenContract.mint(exchangeContract.address, depositAmount);
    expect(await tokenContract.balanceOf(exchangeContract.address) * 1).to.equal(depositAmount * 1);
    await exchangeContract.withdrawCurrencyTo(tokenContract.address, owner.address);
    expect(await tokenContract.balanceOf(exchangeContract.address) * 1).to.equal(0);
    expect(await tokenContract.balanceOf(owner.address) * 1).to.equal(depositAmount * 1);
  });

  it('Should withdraw erc1155 items', async () => {
    const itemIds = [ 3, 4 ];

    await itemsContract.mintBatchToAddress(exchangeContract.address, itemIds, [ 1, 1 ]);
    expect(await itemsContract.balanceOf(exchangeContract.address, itemIds[0])).to.equal(1);
    expect(await itemsContract.balanceOf(exchangeContract.address, itemIds[1])).to.equal(1);
    await exchangeContract.withdrawItemsTo(itemsContract.address, itemIds, owner.address);
    expect(await itemsContract.balanceOf(exchangeContract.address, itemIds[0])).to.equal(0);
    expect(await itemsContract.balanceOf(exchangeContract.address, itemIds[1])).to.equal(0);
    expect(await itemsContract.balanceOf(owner.address, itemIds[0])).to.equal(1);
    expect(await itemsContract.balanceOf(owner.address, itemIds[1])).to.equal(1);
  });

  it('Fails to withdraw when not owner', async () => {
    await otherAddresses[0].sendTransaction({
      to: exchangeContract.address,
      value: getTokenDecimalAmount(100),
    });

    await tokenContract.mint(exchangeContract.address, getTokenDecimalAmount(175));

    await itemsContract.mintBatchToAddress(exchangeContract.address, [ 3 ], [ 1 ]);

    await expect(exchangeContract.connect(otherAddresses[0]).withdrawTo(owner.address)).to.be.reverted;
    await expect(exchangeContract.connect(otherAddresses[0]).withdrawCurrencyTo(tokenContract.address, owner.address)).to.be.reverted;
    await expect(exchangeContract.connect(otherAddresses[0]).withdrawItemsTo(itemsContract.address, [ 3 ], owner.address)).to.be.reverted;
  });

  /*
   * Gasless Transaction Tests
   */

  it('Should cover spender gas fees when submitting transactions to forwarder', async () => {
    const chainId = 31337; // hardhat
    const sender = otherAddresses[1];
    const recipient = otherAddresses[2];
    const offerId = 94884;
    const itemPrice = getTokenDecimalAmount(10);

    await setGenericOffer({
      offerId,
      inputCurrencyAmount: itemPrice,
      outputCollectionItemIds: [ 1 ],
      canMint: true,
    });

    await tokenContract.mint(sender.address, itemPrice);
    await tokenContract.connect(sender).approve(exchangeContract.address, itemPrice);

    const offer = await exchangeContract.offer(offerId);
    const itemId = offer.outputCollectionItemIds[0];

    // create request object
    const data = [ offerId ];
    const gasEstimate = await exchangeContract.connect(sender).estimateGas.useOffer(offerId);
    const callData = exchangeContract.interface.encodeFunctionData('useOffer', data);
    const forwardRequest = {
      from: sender.address,
      to: exchangeContract.address,
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
    await exchangeContract.upgradeTrustedForwarder(otherAddresses[1].address);
    expect(await exchangeContract.isTrustedForwarder(otherAddresses[1].address)).to.equal(true);
  });

  it('Fails to upgrade trusted forwarder if not owner', async () => {
    await expect(exchangeContract.connect(otherAddresses[0]).upgradeTrustedForwarder(
      otherAddresses[1].address,
    )).to.be.reverted;
  });

  /**
   * Helpers
   */

  async function setOffer({
    offerId,
    inputCollection = ethers.constants.AddressZero,
    inputCurrency = ethers.constants.AddressZero,
    inputCollectionItemIds = [],
    inputCollectionItemAmounts = [],
    inputCurrencyAmount = 0,
    outputCollection = ethers.constants.AddressZero,
    outputCurrency = ethers.constants.AddressZero,
    outputCollectionItemIds = [],
    outputCollectionItemAmounts = [],
    outputCurrencyAmount = 0,
    maxUses = 0,
    canMint = false
  }) {
    if (canMint) {
      await itemsContract.grantRole(ethers.utils.id("METAFAB_MINTER_ROLE"), exchangeContract.address);
      await tokenContract.grantRole(ethers.utils.id("METAFAB_MINTER_ROLE"), exchangeContract.address);
    }

    return exchangeContract.setOffer(
      offerId,
      [ inputCollection, outputCollection ],
      [ inputCollectionItemIds, outputCollectionItemIds ],
      [ inputCollectionItemAmounts, outputCollectionItemAmounts ],
      [ inputCurrency, outputCurrency ],
      [ inputCurrencyAmount, outputCurrencyAmount ],
      maxUses,
    );
  }

  async function setGenericOffer({
    offerId,
    inputCollectionItemIds,
    inputCurrencyAmount,
    outputCollectionItemIds,
    outputCurrencyAmount,
    maxUses,
    canMint,
  }) {
    return setOffer({
      offerId,
      inputCollection: inputCollectionItemIds ? itemsContract.address : undefined,
      inputCurrency: inputCurrencyAmount ? tokenContract.address : undefined,
      inputCollectionItemIds,
      inputCollectionItemAmounts: inputCollectionItemIds ? inputCollectionItemIds.map(() => 1) : [],
      inputCurrencyAmount,
      outputCollection: outputCollectionItemIds ? itemsContract.address : undefined,
      outputCurrency: outputCurrencyAmount ? tokenContract.address : undefined,
      outputCollectionItemIds,
      outputCollectionItemAmounts: outputCollectionItemIds ? outputCollectionItemIds.map(() => 1) : [],
      outputCurrencyAmount,
      maxUses,
      canMint,
    });
  }

  async function mintItemToAddress(toAddress, itemId, quantity) {
    return itemsContract.connect(owner).mintToAddress(toAddress, itemId, quantity);
  }

  function getTokenDecimalAmount(amount) {
    return BigNumber.from(BigInt(amount * 1e18));
  }
});
