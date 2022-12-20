const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = ethers;

const abiCoder = ethers.utils.defaultAbiCoder;

describe('Game_Shop', () => {
  const systemId = ethers.utils.id('euahfe-31351-awduawh');

  let systemDelegateApproverAddress;
  let systemDelegateApproverContract;
  let forwarderAddress;
  let forwarderContract;
  let tokenContract;
  let itemsContract;
  let shopContract;
  let owner;
  let otherAddresses;

  beforeEach(async () => {
    const [ _owner, ..._otherAddresses ] = await ethers.getSigners();

    const System_Delegate_Approver = await ethers.getContractFactory('System_Delegate_Approver');
    const ERC2771_Trusted_Forwarder = await ethers.getContractFactory('ERC2771_Trusted_Forwarder');
    const ERC20_Game_Currency = await ethers.getContractFactory('ERC20_Game_Currency');
    const ERC1155_Game_Items_Collection = await ethers.getContractFactory('ERC1155_Game_Items_Collection');
    const Game_Shop = await ethers.getContractFactory('Game_Shop');

    owner = _owner;
    otherAddresses = _otherAddresses;

    systemDelegateApproverContract = await System_Delegate_Approver.deploy();
    systemDelegateApproverAddress = systemDelegateApproverContract.address;

    forwarderContract = await ERC2771_Trusted_Forwarder.deploy(systemDelegateApproverAddress);
    forwarderAddress = forwarderContract.address;

    tokenContract = await ERC20_Game_Currency.deploy(
      "My Game Token",
      "MGT",
      getTokenDecimalAmount(1000000),
      forwarderAddress,
      systemId,
    );

    itemsContract = await ERC1155_Game_Items_Collection.deploy(forwarderAddress, systemId);

    shopContract = await Game_Shop.deploy(forwarderAddress, systemId);
  });

  /*
   * General Tests
   */

  it('Should deploy', async () => {
    await forwarderContract.deployed();
    await tokenContract.deployed();
    await itemsContract.deployed();
    await shopContract.deployed();
  });

  it('Should properly handle role management and assignments', async () => {
    await shopContract.deployed();

    const manager = otherAddresses[0];
    const target = otherAddresses[1];
    const targetTwo = otherAddresses[2];

    await shopContract.grantRole(ethers.utils.id('METAFAB_MANAGER_ROLE'), manager.address); // admin can assign manager
    await shopContract.connect(manager).grantRole(ethers.utils.id('METAFAB_MINTER_ROLE'), target.address); // manager can assign all non-admin/non-manager roles
    await expect(shopContract.connect(manager).grantRole(ethers.utils.id('METAFAB_MANAGER_ROLE'), target.address)).to.be.reverted; // manager cannot assign manager role
    await expect(shopContract.connect(manager).grantRole(ethers.constants.HashZero, target.address)).to.be.reverted // manager cannot assign admin role
    await expect(shopContract.connect(target).grantRole(ethers.utils.id('METAFAB_MANAGER_ROLE'), targetTwo.address)).to.be.reverted; // random address cannot assign roles
    await expect(shopContract.connect(target).grantRole(ethers.utils.id('RANDOM_ROLE'), targetTwo.address)).to.be.reverted; // random address cannot assign roles
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

    const offer = await shopContract.offer(offerId);

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

    const offer = await shopContract.offer(offerId);

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

    const offer = await shopContract.offer(offerId);

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
    const offers = await shopContract.paginateOffers(0, 15); // pagination should not overflow, 15 used to test

    // offers
    expect(offers.length).to.equal(totalOffers);

    for (let i = 0; i < totalOffers; i++) {
      expect(offers[i].id * 1).to.equal(i);
    }

    // offer ids
    const offerIds = await shopContract.paginateOfferIds(0, 15);

    expect(offerIds.length).to.equal(totalOffers);

    for (let i = 0; i < totalOffers; i++) {
      expect(offerIds[i] * 1).to.equal(i);
    }

    // offer last updates
    const offerLastUpdates = await shopContract.paginateOfferLastUpdates(0, 15);

    expect(offerLastUpdates.length).to.equal(totalOffers);

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

    expect((await shopContract.offer(offerId)).id * 1).to.equal(offerId);

    await shopContract.removeOffer(offerId);

    expect(await shopContract.totalOffers() * 1).to.equal(0)

    await expect(shopContract.offer(offerId)).to.be.reverted;
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
    const offer = await shopContract.offer(offerId);

    await tokenContract.mint(user.address, itemPrice);
    await tokenContract.connect(user).approve(shopContract.address, itemPrice);
    await shopContract.connect(user).useOffer(offerId);

    expect(await tokenContract.balanceOf(user.address) * 1).to.equal(0);
    expect(await tokenContract.balanceOf(shopContract.address) * 1).to.equal(itemPrice * 1);
    expect((await shopContract.offer(offerId)).uses).to.equal(1);
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
    const offer = await shopContract.offer(offerId);
    const itemId = offer.outputCollectionItemIds[0];

    await tokenContract.mint(user.address, itemPrice);
    await tokenContract.connect(user).approve(shopContract.address, itemPrice);
    await itemsContract.mintToAddress(shopContract.address, itemId, 1);
    await shopContract.connect(user).useOffer(offerId);

    expect(await tokenContract.balanceOf(user.address) * 1).to.equal(0);
    expect(await tokenContract.balanceOf(shopContract.address) * 1).to.equal(itemPrice * 1);
    expect(await itemsContract.balanceOf(user.address, itemId) * 1).to.equal(1);
    expect(await itemsContract.balanceOf(shopContract.address, itemId) * 1).to.equal(0);
    expect((await shopContract.offer(offerId)).uses).to.equal(1);
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
    const offer = await shopContract.offer(offerId);
    const itemId = offer.inputCollectionItemIds[0];

    await itemsContract.mintToAddress(user.address, itemId, 1);
    await itemsContract.connect(user).setApprovalForAll(shopContract.address, true);
    await shopContract.connect(user).useOffer(offerId);

    expect(await itemsContract.balanceOf(user.address, itemId) * 1).to.equal(0);
    expect(await itemsContract.balanceOf(shopContract.address, itemId) * 1).to.equal(1);
    expect((await shopContract.offer(offerId)).uses).to.equal(1);
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
    const offer = await shopContract.offer(offerId);
    const itemId = offer.inputCollectionItemIds[0];

    await itemsContract.mintToAddress(user.address, itemId, 1);
    await itemsContract.connect(user).setApprovalForAll(shopContract.address, true);
    await tokenContract.mint(shopContract.address, sellPrice);
    await shopContract.connect(user).useOffer(offerId);

    expect(await itemsContract.balanceOf(user.address, itemId) * 1).to.equal(0);
    expect(await itemsContract.balanceOf(shopContract.address, itemId) * 1).to.equal(1);
    expect(await tokenContract.balanceOf(user.address) * 1).to.equal(sellPrice * 1);
    expect(await tokenContract.balanceOf(shopContract.address) * 1).to.equal(0);
    expect((await shopContract.offer(offerId)).uses).to.equal(1);
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
    const offer = await shopContract.offer(offerId);
    const inputItemIdOne = offer.inputCollectionItemIds[0];
    const inputItemIdTwo = offer.inputCollectionItemIds[1];
    const outputItemId = offer.outputCollectionItemIds[0];

    await itemsContract.mintToAddress(user.address, inputItemIdOne, 1);
    await itemsContract.mintToAddress(user.address, inputItemIdTwo, 1);
    await itemsContract.connect(user).setApprovalForAll(shopContract.address, true);
    await shopContract.connect(user).useOffer(offerId);

    expect(await itemsContract.balanceOf(user.address, inputItemIdOne) * 1).to.equal(0);
    expect(await itemsContract.balanceOf(user.address, inputItemIdTwo) * 1).to.equal(0);
    expect(await itemsContract.balanceOf(user.address, outputItemId) * 1).to.equal(1);
    expect((await shopContract.offer(offerId)).uses).to.equal(1);
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

    await shopContract.connect(user).useOffer(offerId, {
      value: itemPrice,
    });

    expect(await user.getBalance() * 1).to.be.below(userStartBalance - itemPrice * 1); // less price + gas
    expect(await user.provider.getBalance(shopContract.address) * 1).to.equal(itemPrice * 1);
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
      to: shopContract.address,
      value: ethers.utils.parseEther('2.0'),
    });

    await itemsContract.mintToAddress(user.address, itemId, 1);
    await itemsContract.connect(user).setApprovalForAll(shopContract.address, true);
    await shopContract.connect(user).useOffer(offerId);

    expect(await user.getBalance() * 1).to.be.above(userStartBalance);
    expect(await user.provider.getBalance(shopContract.address) * 1).to.equal(0);
    expect(await itemsContract.balanceOf(shopContract.address, itemId) * 1).to.equal(1);
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
    const offer = await shopContract.offer(offerId);
    const itemId = offer.outputCollectionItemIds[0];

    await tokenContract.mint(user.address, itemPrice);
    await tokenContract.connect(user).approve(shopContract.address, itemPrice);
    await expect(shopContract.connect(user).useOffer(offerId)).to.be.reverted;
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
    const offer = await shopContract.offer(offerId);
    const itemId = offer.inputCollectionItemIds[0];

    await itemsContract.mintToAddress(user.address, itemId, 1);
    await itemsContract.connect(user).setApprovalForAll(shopContract.address, true);
    await expect(shopContract.connect(user).useOffer(offerId)).to.be.reverted;
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
    const offer = await shopContract.offer(offerId);
    const itemId = offer.outputCollectionItemIds[0];

    await tokenContract.mint(user.address, itemPrice.mul(2));
    await tokenContract.connect(user).approve(shopContract.address, itemPrice.mul(2));
    await shopContract.connect(user).useOffer(offerId);
    await expect(shopContract.connect(user).useOffer(offerId)).to.be.reverted; // single use
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
    const offer = await shopContract.offer(offerId);
    const itemId = offer.outputCollectionItemIds[0];

    await tokenContract.connect(user).approve(shopContract.address, itemPrice);
    await expect(shopContract.connect(user).useOffer(offerId)).to.be.reverted;
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
    const offer = await shopContract.offer(offerId);
    const itemId = offer.inputCollectionItemIds[0];

    await itemsContract.connect(user).setApprovalForAll(shopContract.address, true);
    await expect(shopContract.connect(user).useOffer(offerId)).to.be.reverted;
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

    await expect(shopContract.connect(otherAddresses[0]).setOffer(...args)).to.be.reverted;
  });

  it('Fails to remove offers when not owner', async () => {
    const offerId  = 482;

    await setGenericOffer({
      offerId,
      inputCurrencyAmount: getTokenDecimalAmount(10),
      outputCollectionItemIds: [ 1 ],
      canMint: false,
    });

    await expect(shopContract.connect(otherAddresses[0]).removeOffer(offerId)).to.be.reverted;
  });

  /*
   * Withdrawal Tests
   */

  it('Should withdraw native chain token', async () => {
    const depositAmount = getTokenDecimalAmount(150);
    const ownerStartBalance = await owner.getBalance();

    await otherAddresses[0].sendTransaction({
      to: shopContract.address,
      value: depositAmount,
    });

    expect(await owner.provider.getBalance(shopContract.address) * 1).to.equal(depositAmount * 1);

    await shopContract.withdrawTo(owner.address);

    expect(await owner.provider.getBalance(shopContract.address) * 1).to.equal(0);
    expect(await owner.getBalance() * 1).to.be.above(ownerStartBalance * 1);
  });

  it('Should withdraw erc20 currency tokens', async () => {
    const depositAmount = getTokenDecimalAmount(175);

    await tokenContract.mint(shopContract.address, depositAmount);
    expect(await tokenContract.balanceOf(shopContract.address) * 1).to.equal(depositAmount * 1);
    await shopContract.withdrawCurrencyTo(tokenContract.address, owner.address);
    expect(await tokenContract.balanceOf(shopContract.address) * 1).to.equal(0);
    expect(await tokenContract.balanceOf(owner.address) * 1).to.equal(depositAmount * 1);
  });

  it('Should withdraw erc1155 items', async () => {
    const itemIds = [ 3, 4 ];

    await itemsContract.mintBatchToAddress(shopContract.address, itemIds, [ 1, 1 ]);
    expect(await itemsContract.balanceOf(shopContract.address, itemIds[0])).to.equal(1);
    expect(await itemsContract.balanceOf(shopContract.address, itemIds[1])).to.equal(1);
    await shopContract.withdrawItemsTo(itemsContract.address, itemIds, owner.address);
    expect(await itemsContract.balanceOf(shopContract.address, itemIds[0])).to.equal(0);
    expect(await itemsContract.balanceOf(shopContract.address, itemIds[1])).to.equal(0);
    expect(await itemsContract.balanceOf(owner.address, itemIds[0])).to.equal(1);
    expect(await itemsContract.balanceOf(owner.address, itemIds[1])).to.equal(1);
  });

  it('Fails to withdraw when not owner', async () => {
    await otherAddresses[0].sendTransaction({
      to: shopContract.address,
      value: getTokenDecimalAmount(100),
    });

    await tokenContract.mint(shopContract.address, getTokenDecimalAmount(175));

    await itemsContract.mintBatchToAddress(shopContract.address, [ 3 ], [ 1 ]);

    await expect(shopContract.connect(otherAddresses[0]).withdrawTo(owner.address)).to.be.reverted;
    await expect(shopContract.connect(otherAddresses[0]).withdrawCurrencyTo(tokenContract.address, owner.address)).to.be.reverted;
    await expect(shopContract.connect(otherAddresses[0]).withdrawItemsTo(itemsContract.address, [ 3 ], owner.address)).to.be.reverted;
  });

  /*
   * Gasless Transaction Tests
   */

  it('Should cover spender gas fees when submitting transactions to forwarder', async () => {
    const chainId = 31337; // hardhat
    const sender = otherAddresses[1];
    const offerId = 94884;
    const itemPrice = getTokenDecimalAmount(10);

    await setGenericOffer({
      offerId,
      inputCurrencyAmount: itemPrice,
      outputCollectionItemIds: [ 1 ],
      canMint: true,
    });

    await tokenContract.mint(sender.address, itemPrice);
    await tokenContract.connect(sender).approve(shopContract.address, itemPrice);

    const offer = await shopContract.offer(offerId);
    const itemId = offer.outputCollectionItemIds[0];

    // create request object
    const data = [ offerId ];
    const gasEstimate = await shopContract.connect(sender).estimateGas.useOffer(offerId);
    const callData = shopContract.interface.encodeFunctionData('useOffer', data);
    const forwardRequest = {
      from: sender.address,
      to: shopContract.address,
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
    await shopContract.upgradeTrustedForwarder(otherAddresses[1].address);
    expect(await shopContract.isTrustedForwarder(otherAddresses[1].address)).to.equal(true);
  });

  it('Fails to upgrade trusted forwarder if not owner', async () => {
    await expect(shopContract.connect(otherAddresses[0]).upgradeTrustedForwarder(
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
      await itemsContract.grantRole(ethers.utils.id("METAFAB_MINTER_ROLE"), shopContract.address);
      await tokenContract.grantRole(ethers.utils.id("METAFAB_MINTER_ROLE"), shopContract.address);
    }

    return shopContract.setOffer(
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
