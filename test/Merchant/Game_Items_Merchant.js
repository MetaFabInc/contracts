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

  it('Should set buy offer', async () => {
    const itemIds = [ 53 ];
    const itemAmounts = [ 1 ];
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
    const buyableItemOffer = await merchantContract.buyableItemOffers(buyableItemOfferId);

console.log(await merchantContract.getBuyableItemOfferItemIds(buyableItemOfferId));
    expect(buyableItemOffer.isActive).to.equal(true);
    expect(buyableItemOffer.currencyAmount * 1).to.equal(currencyAmount * 1);
  });

  it('Should set sell offer', async () => {

  });

  /*
   * Withdrawal Tests
   */

  /**
   * Helpers
   */

  async function setItemOffer(type, itemsAddress, itemIds, itemAmounts, currencyAddress, currencyAmount, maxUses) {
    const setOfferFunc = type === 'buyable' ? merchantContract.setBuyableItemOffer : merchantContract.setSellableItemOffer;

    await itemsContract.grantRole(ethers.utils.id("METAFAB_MINTER_ROLE"), merchantContract.address);

    return setOfferFunc(
      itemsAddress,
      itemIds,
      itemAmounts,
      currencyAddress,
      currencyAmount,
      maxUses,
    );
  }

  async function mintItemToAddress(toAddress, itemId, quantity) {
    return itemsContract.connect(owner).mintToAddress(toAddress, itemId, quantity);
  }

  function getTokenDecimalAmount(amount) {
    return BigNumber.from(BigInt(amount * 1e18));
  }
});
