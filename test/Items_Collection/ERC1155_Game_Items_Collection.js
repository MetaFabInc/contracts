const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = ethers;

const abiCoder = ethers.utils.defaultAbiCoder;

describe('ERC1155_Game_Items_Collection', () => {
  let forwarderAddress;
  let forwarderContract;
  let itemsContract;
  let owner;
  let otherAddresses;

  beforeEach(async () => {
    const [ _owner, ..._otherAddresses ] = await ethers.getSigners();

    const ERC2771_Trusted_Forwarder = await ethers.getContractFactory('ERC2771_Trusted_Forwarder');
    const ERC1155_Game_Items_Collection = await ethers.getContractFactory('ERC1155_Game_Items_Collection');

    owner = _owner;
    otherAddresses = _otherAddresses;

    forwarderContract = await ERC2771_Trusted_Forwarder.deploy();
    forwarderAddress = forwarderContract.address;

    itemsContract = await ERC1155_Game_Items_Collection.deploy(forwarderAddress);
  });

  /*
   * General Tests
   */

  it('Should deploy', async () => {
    await forwarderContract.deployed();
    await itemsContract.deployed();
  });

  /*
   * Metadata Tests
   */

  it('Should set item uri and return item uri', async () => {
    const uri = 'https://testing.com/0.png'

    await mintItemToAddress(owner.address, 0, 1);
    await itemsContract.setItemURI(0, uri);

    expect(await itemsContract.uri(0)).to.equal(uri);
  });

  it('Should set itemBaseURI and return itemId uris with itemBaseURI prefixed', async () => {
    const itemBaseURI = 'https://ipfs.trymetafab.com/ipfs/testing/';

    await mintItemToAddress(owner.address, 0, 1);
    await itemsContract.setItemBaseURI(itemBaseURI);

    expect(await itemsContract.uri(0)).to.equal(`${itemBaseURI}0`);
  });

  it('Fails to retrieve item uri for itemId that does not exist', async () => {
    await expect(itemsContract.uri(3)).to.be.reverted;
  });

  /*
   * Mint Tests
   */

  it('Should mint item id to address', async () => {
    const recipientAddress = otherAddresses[0].address
    const itemId = 0;
    const quantity = 1;

    await mintItemToAddress(recipientAddress, itemId, quantity);

    expect(await itemsContract.balanceOf(recipientAddress, itemId)).to.equal(quantity);
  });

  it('Should mint item id to address if minter', async () => {
    const minter = otherAddresses[0];
    const recipientAddress = otherAddresses[1].address;
    const itemId = 0;
    const quantity = 1;

    await itemsContract.grantRole(ethers.utils.id("METAFAB_MINTER_ROLE"), minter.address);

    await itemsContract.connect(minter).mintToAddress(recipientAddress, itemId, quantity);

    expect(await itemsContract.balanceOf(recipientAddress, itemId)).to.equal(quantity);
  });

  it('Should mint batch item ids to address', async () => {
    const recipientAddress = otherAddresses[0].address;
    const itemIds = [ 0, 2, 4, 5 ];
    const quantities = [ 5, 5, 5, 6 ];

    await itemsContract.mintBatchToAddress(recipientAddress, itemIds, quantities);

    for (let i = 0; i < itemIds.length; i++) {
      expect(await itemsContract.balanceOf(recipientAddress, itemIds[i])).to.equal(quantities[i]);
    }
  });

  it('Fails to mint when not owner or minter', async () => {
    const nonMinter = otherAddresses[0];

    await expect(
      itemsContract.connect(nonMinter).mintToAddress(
        nonMinter.address,
        0,
        1,
      )).to.be.reverted;
  });

  /*
   * Burn Tests
   */

  it('Should burn item', async () => {
    const recipient = otherAddresses[0];
    const itemId = 0;
    const quantity = 1;

    await mintItemToAddress(recipient.address, itemId, quantity);

    await itemsContract.connect(recipient).burnFromAddress(recipient.address, itemId, quantity);

    expect(await itemsContract.balanceOf(recipient.address, itemId)).to.equal(0);
  });

  it('Should batch burn items', async () => {
    const recipient = otherAddresses[0];
    const itemIds = [ 0, 1 ];
    const quantities = [ 1, 1 ];

    await itemsContract.mintBatchToAddress(recipient.address, itemIds, quantities);

    await itemsContract.connect(recipient).burnBatchFromAddress(recipient.address, itemIds, quantities);

    for (let i = 0; i < itemIds.length; i++) {
      expect(await itemsContract.balanceOf(recipient.address, itemIds[i])).to.equal(0);
    }
  });

  it('Should burn items from address with approval', async () => {
    const recipient = otherAddresses[0];
    const itemId = 0;
    const quantity = 1;

    await mintItemToAddress(recipient.address, itemId, quantity);

    await itemsContract.connect(recipient).setApprovalForAll(owner.address, true);

    await itemsContract.burnFromAddress(recipient.address, itemId, quantity);

    expect(await itemsContract.balanceOf(recipient.address, itemId)).to.equal(0);
  });

  it('Should batch burn items from address with approval', async () => {
    const recipient = otherAddresses[0];
    const itemIds = [ 0, 1 ];
    const quantities = [ 2, 3 ];

    await itemsContract.mintBatchToAddress(recipient.address, itemIds, quantities);

    await itemsContract.connect(recipient).setApprovalForAll(owner.address, true);

    await itemsContract.burnBatchFromAddress(recipient.address, itemIds, quantities);

    for (let i = 0; i < itemIds.length; i++) {
      expect(await itemsContract.balanceOf(recipient.address, itemIds[i])).to.equal(0);
    }
  });

  it('Fails to burn when not item owner nor approved', async () => {
    const recipient = otherAddresses[0];
    const itemId = 0;
    const quantity = 1;

    await mintItemToAddress(recipient.address, itemId, quantity);

    await expect(itemsContract.connect(otherAddresses[1]).burnFromAddress(
      recipient.address,
      itemId,
      quantity,
    )).to.be.reverted;
  });

  /*
   * Transfer Tests
   */

  it('Should bulk safe batch transfer single item to multiple addresses', async () => {
    const recipientAddresses = [ otherAddresses[0].address, otherAddresses[1].address ];
    const itemId = 0;
    const quantity = 10;
    const transferAmount = 5;

    await mintItemToAddress(owner.address, itemId, quantity);

    await itemsContract.bulkSafeBatchTransferFrom(owner.address, recipientAddresses, [ itemId ], [ transferAmount ]);

    for (let i = 0; i < recipientAddresses.length; i++) {
      expect(await itemsContract.balanceOf(recipientAddresses[i], itemId)).to.equal(transferAmount);
    }
  });

  it('Should bulk safe batch transfer items to multiple addresses', async () => {
    const recipientAddresses = [ otherAddresses[0].address, otherAddresses[1].address ];
    const itemIds = [ 0, 1 ];
    const quantities = [ 5, 5 ];
    const transferAmounts = [ 1, 2 ];

    await itemsContract.mintBatchToAddress(owner.address, itemIds, quantities);

    await itemsContract.bulkSafeBatchTransferFrom(owner.address, recipientAddresses, itemIds, transferAmounts);

    for (let i = 0; i < recipientAddresses.length; i++) {
      for (let k = 0; k < itemIds.length; k++) {
        expect(await itemsContract.balanceOf(recipientAddresses[i], itemIds[k])).to.equal(transferAmounts[k]);
      }
    }
  });

  it('Fails to bulk safe batch transfer when not item owner nor approved', async () => {
    const recipientAddresses = [ otherAddresses[0].address, otherAddresses[1].address ];
    const itemIds = [ 0, 1 ];
    const quantities = [ 5, 5 ];
    const transferAmounts = [ 1, 2 ];

    await itemsContract.mintBatchToAddress(owner.address, itemIds, quantities);

    await itemsContract.bulkSafeBatchTransferFrom(owner.address, recipientAddresses, itemIds, transferAmounts);

    await expect(itemsContract.bulkSafeBatchTransferFrom(
      recipientAddresses[0],
      [ owner.address, recipientAddresses[1] ],
      itemIds,
      transferAmounts,
    )).to.be.reverted
  });

  /*
   * Gasless Transaction Tests
   */

  it('Should cover spender gas fees when submitting transactions to forwarder', async () => {
    const chainId = 31337; // hardhat
    const sender = otherAddresses[1];
    const recipient = otherAddresses[2];
    const itemId = 1;
    const quantity = 5;
    const transferAmount = 1;

    // mint some items
    await mintItemToAddress(sender.address, itemId, quantity);

    // create request object
    const data = [
      sender.address,
      recipient.address,
      itemId,
      transferAmount,
      [],
    ];
    const gasEstimate = await itemsContract.connect(sender).estimateGas.safeTransferFrom(...data);

    const callData = itemsContract.interface.encodeFunctionData('safeTransferFrom', data);
    const forwardRequest = {
      from: sender.address,
      to: itemsContract.address,
      value: getTokenDecimalAmount(0),
      gas: gasEstimate,
      nonce: 421,
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

    expect(await itemsContract.balanceOf(recipient.address, itemId)).to.equal(0);
    await forwarderContract.connect(externalAccount).execute(forwardRequest, signature);
    expect(await externalAccount.getBalance() * 1).to.be.below(startingExternalAccountBalance);
    expect(await itemsContract.balanceOf(recipient.address, itemId)).to.equal(transferAmount);

    // attempt to re-execute request one, it should fail since the nonce is used
    await expect(
      forwarderContract.connect(externalAccount).execute(
        forwardRequest,
        signature,
      )
    ).to.be.reverted;
  });

  it('Should properly upgrade trusted forwarder', async () => {
    await itemsContract.upgradeTrustedForwarder(otherAddresses[1].address);
    expect(await itemsContract.isTrustedForwarder(otherAddresses[1].address)).to.equal(true);
  });

  it('Fails to upgrade trusted forwarder if not owner', async () => {
    await expect(itemsContract.connect(otherAddresses[0]).upgradeTrustedForwarder(
      otherAddresses[1].address,
    )).to.be.reverted;
  });

  /*
   * Timelock tests
   */

  it('Should set item transfer timelock and properly return bool for isItemTransferrable', async () => {
    const itemId = 0;
    const unlockTimestamp = Math.floor(Date.now() / 1000) + 300; // 5 min from now

    expect(await itemsContract.isItemTransferrable(itemId)).to.equal(true);

    await itemsContract.setItemTransferTimelock(itemId, unlockTimestamp);

    expect(await itemsContract.isItemTransferrable(itemId)).to.equal(false);
  });

  it('Should allow mint and burn but not allow item transfer that has not surpassed transfer timelock', async () => {
    const recipient = otherAddresses[2];
    const itemId = 0;
    const quantity = 10;
    const unlockTimestamp = Math.floor(Date.now() / 1000) + 300; // 5 min from now

    await itemsContract.setItemTransferTimelock(itemId, unlockTimestamp);

    await mintItemToAddress(owner.address, itemId, quantity);
    await itemsContract.safeTransferFrom(owner.address, recipient.address, itemId, 2, []);
    await itemsContract.burnFromAddress(owner.address, itemId, 1);

    await expect(itemsContract.connect(recipient).safeTransferFrom(
      recipient.address,
      owner.address,
      itemId,
      2,
      [],
    )).to.be.reverted;
  });

  /*
   * Supply Tests
   */

   it('Should properly update item supply when minted or burned and return proper bool for itemExists', async () => {
     const itemId = 123;
     const quantity = 15;

     expect(await itemsContract.itemSupplies(itemId)).to.equal(0);
     expect(await itemsContract.itemExists(itemId)).to.equal(false);

     await mintItemToAddress(owner.address, itemId, quantity);
     expect(await itemsContract.itemSupplies(itemId)).to.equal(quantity);

     await itemsContract.burnFromAddress(owner.address, itemId, 5);
     expect(await itemsContract.itemSupplies(itemId)).to.equal(quantity - 5);
     expect(await itemsContract.itemExists(itemId)).to.equal(true);

     await expect(itemsContract.burnFromAddress(
       owner.address,
       itemId,
       100,
     )).to.be.reverted;
   });

   it('Should return item ids for all items that have been minted at least once', async () => {
     const itemIds = [ 1, 1, 23, 446, 42, 33];

     for (let i = 0; i < itemIds.length; i++) {
       await mintItemToAddress(owner.address, itemIds[i], 1);
     }

     const allItemIds = await itemsContract.allItemIds();

     expect(allItemIds.length).to.equal(itemIds.length - 1); // should not have duplicate 1 item id.
   });

  /*
   * Iteration Tests
   */

  it('Should return all item balances for address', async () => {
    for (let i = 0; i < 50; i++) {
      await mintItemToAddress(owner.address, Math.floor((Math.random() * 10000)), 1);
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // local chain can lag
    const allBalances = await itemsContract.balanceOfAll(owner.address);

    expect(allBalances.length).to.equal(50);
    expect(allBalances[0].length).to.equal(2);
  })

  it('Should get all item ids', async () => {
    for (let i = 0; i < 50; i++) {
      await mintItemToAddress(owner.address, Math.floor((Math.random() * 10000)), 1);
    }

    const allItemIds = await itemsContract.allItemIds();

    expect(allItemIds.length).to.not.equal(0);
  });

  it('Should iterate available item ids, item supplies and item uris', async () => {
    for (let i = 0; i < 50; i++) {
      await mintItemToAddress(owner.address, Math.floor((Math.random() * 10000)), 1);
    }

    const totalItemIds = await itemsContract.totalItemIds();

    expect(totalItemIds).to.not.equal(0);

    const itemIds = [];

    for (let i = 0; i < totalItemIds; i++) {
      itemIds.push(await itemsContract.itemIds(i));
    }

    expect(itemIds.length).to.equal(totalItemIds);
  });

  it('Should return all or paginate item ids, item supplies and item uris', async () => {
    const itemIds = [];
    const totalItems = 50;

    for (let i = 0; i < totalItems; i++) {
      const itemId = i * 5;
      await mintItemToAddress(owner.address, itemId, 1);
      await itemsContract.setItemURI(itemId, `ipfs://${itemId}`);
      itemIds.push(itemId);
    }

    const allItemIds = await itemsContract.allItemIds();
    for (let i = 0; i < itemIds.length; i++) {
      expect(allItemIds[i] * 1).to.equal(itemIds[i]);
    }

    const allItemSupplies = await itemsContract.allItemSupplies();
    for (let i = 0; i < itemIds.length; i++) {
      expect(allItemSupplies[i][0] * 1).to.equal(itemIds[i] * 1);
      expect(allItemSupplies[i][1] * 1).to.equal(1);
    }

    const allItemURIs = await itemsContract.allItemURIs();
    for(let i = 0; i < itemIds.length; i++) {
      expect(allItemURIs[i]).to.equal(`ipfs://${itemIds[i]}`);
    }

    const paginatedItemIds = await itemsContract.paginateItemIds(5, 10);
    for (let i = 5; i < 5 + 10; i++) {
      expect(allItemIds[i]).to.equal(paginatedItemIds[i - 5]);
    }

    const paginatedItemSupplies = await itemsContract.paginateItemSupplies(5, 10);
    for (let i = 5; i < 5 + 10; i++) {
      expect(allItemSupplies[i][0] * 1).to.equal(paginatedItemSupplies[i - 5][0] * 1);
      expect(allItemSupplies[i][1] * 1).to.equal(paginatedItemSupplies[i - 5][1] * 1);
    }

    const paginatedItemURIs = await itemsContract.paginateItemURIs(5, 10);
    for (let i = 5; i < 5 + 10; i++) {
      expect(allItemURIs[i]).to.equal(paginatedItemURIs[i - 5]);
    }

    // handles pagination overflow
    expect((await itemsContract.paginateItemIds(100, 100)).length).to.equal(0);
    expect((await itemsContract.paginateItemIds(40, 100)).length).to.equal(10);
    expect((await itemsContract.paginateItemSupplies(100, 100)).length).to.equal(0);
    expect((await itemsContract.paginateItemSupplies(40, 100)).length).to.equal(10);
    expect((await itemsContract.paginateItemURIs(100, 100)).length).to.equal(0);
    expect((await itemsContract.paginateItemURIs(40, 100)).length).to.equal(10);
  });

  it('Should retain one unique itemId in itemIds when supply goes to zero and is reincremented', async () => {
    await mintItemToAddress(owner.address, 1, 1);
    await itemsContract.burnFromAddress(owner.address, 1, 1);
    await mintItemToAddress(owner.address, 1, 1);

    const itemIds = await itemsContract.allItemIds();

    expect(itemIds.length).to.equal(1);
  });

  /**
   * Helpers
   */

  async function mintItemToAddress(toAddress, itemId, quantity) {
    return itemsContract.connect(owner).mintToAddress(toAddress, itemId, quantity);
  }

  function getTokenDecimalAmount(amount) {
    return BigNumber.from(BigInt(amount * 1e18));
  }
});
