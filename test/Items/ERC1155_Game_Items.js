const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = ethers;

const abiCoder = ethers.utils.defaultAbiCoder;

describe('ERC20_Game_Currency', () => {
  let forwarderAddress;
  let forwarderContract;
  let tokenContract;
  let itemsContract;
  let owner;
  let otherAddresses;

  beforeEach(async () => {
    const [ _owner, ..._otherAddresses ] = await ethers.getSigners();

    const ERC20_Game_Currency = await ethers.getContractFactory('ERC20_Game_Currency');
    const ERC2771_Trusted_Forwarder = await ethers.getContractFactory('ERC2771_Trusted_Forwarder');
    const ERC1155_Game_Items = await ethers.getContractFactory('ERC1155_Game_Items');

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
  });


  /*
   * General Tests
   */

  it('Should deploy', async () => {
    await forwarderContract.deployed();
    await tokenContract.deployed();
    await itemsContract.deployed();
  });

  /**
   * Helpers
   */

  function getTokenDecimalAmount(amount) {
    return BigNumber.from(BigInt(amount * 1e18));
  }
});
