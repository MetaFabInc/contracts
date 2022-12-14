const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = ethers;

const abiCoder = ethers.utils.defaultAbiCoder;

describe('Game_Lootbox_Manager', () => {
  const systemId = ethers.utils.id('125812-suefhseyuf-32513');

  let systemDelegateApproverAddress;
  let systemDelegateApproverContract;
  let forwarderAddress;
  let forwarderContract;
  let itemsContract;
  let lootboxManagerContract;
  let owner;
  let otherAddresses;

  beforeEach(async () => {
    const [ _owner, ..._otherAddresses ] = await ethers.getSigners();

    const System_Delegate_Approver = await ethers.getContractFactory('System_Delegate_Approver');
    const ERC2771_Trusted_Forwarder = await ethers.getContractFactory('ERC2771_Trusted_Forwarder');
    const ERC1155_Game_Items_Collection = await ethers.getContractFactory('ERC1155_Game_Items_Collection');
    const Game_Lootbox_Manager = await ethers.getContractFactory('Game_Lootbox_Manager');

    owner = _owner;
    otherAddresses = _otherAddresses;

    systemDelegateApproverContract = await System_Delegate_Approver.deploy();
    systemDelegateApproverAddress = systemDelegateApproverContract.address;

    forwarderContract = await ERC2771_Trusted_Forwarder.deploy(systemDelegateApproverAddress);
    forwarderAddress = forwarderContract.address;

    itemsContract = await ERC1155_Game_Items_Collection.deploy(forwarderAddress, systemId);

    lootboxManagerContract = await Game_Lootbox_Manager.deploy(forwarderAddress, systemId);
  });

  /*
   * General Tests
   */

  it('Should deploy', async () => {
    await forwarderContract.deployed();
    await itemsContract.deployed();
    await lootboxManagerContract.deployed();
  });

  it('Should properly handle role management and assignments', async () => {
    await lootboxManagerContract.deployed();

    const manager = otherAddresses[0];
    const target = otherAddresses[1];
    const targetTwo = otherAddresses[2];

    await lootboxManagerContract.grantRole(ethers.utils.id('METAFAB_MANAGER_ROLE'), manager.address); // admin can assign manager
    await lootboxManagerContract.connect(manager).grantRole(ethers.utils.id('METAFAB_MINTER_ROLE'), target.address); // manager can assign all non-admin/non-manager roles
    await expect(lootboxManagerContract.connect(manager).grantRole(ethers.utils.id('METAFAB_MANAGER_ROLE'), target.address)).to.be.reverted; // manager cannot assign manager role
    await expect(lootboxManagerContract.connect(manager).grantRole(ethers.constants.HashZero, target.address)).to.be.reverted // manager cannot assign admin role
    await expect(lootboxManagerContract.connect(target).grantRole(ethers.utils.id('METAFAB_MANAGER_ROLE'), targetTwo.address)).to.be.reverted; // random address cannot assign roles
    await expect(lootboxManagerContract.connect(target).grantRole(ethers.utils.id('RANDOM_ROLE'), targetTwo.address)).to.be.reverted; // random address cannot assign roles
  });

  it('Should transfer ownership and control', async () => {
    await lootboxManagerContract.deployed();

    const newOwnerAddress = otherAddresses[0].address;

    expect(await lootboxManagerContract.hasRole(ethers.constants.HashZero, owner.address)).to.equal(true);
    expect(await lootboxManagerContract.hasRole(ethers.constants.HashZero, newOwnerAddress)).to.equal(false);
    await lootboxManagerContract.transferOwnershipControl(newOwnerAddress);
    await expect(lootboxManagerContract.transferOwnershipControl(newOwnerAddress)).to.be.reverted;
    expect(await lootboxManagerContract.hasRole(ethers.constants.HashZero, owner.address)).to.equal(false);
    expect(await lootboxManagerContract.hasRole(ethers.constants.HashZero, newOwnerAddress)).to.equal(true);
  });

  /*
   * Lootbox Tests
   */

  it('Should return current claimable block offset', async () => {
    await lootboxManagerContract.deployed();

    expect(await lootboxManagerContract.claimableBlockOffset()).to.equal(2);
  });

  it('Should set lootbox that requires lootbox item and gives random items', async () => {
    const inputCollectionItemIds = [ 1, 7 ];
    const inputCollectionItemAmounts = [ 2, 3 ];
    const outputCollectionItemIds = [ 3, 99, 12, 52 ];
    const outputCollectionItemAmounts = [ 4, 4, 5, 6 ];
    const outputCollectionItemWeights = [ 5, 25, 100, 1000 ];
    const outputTotalItems = 5;
    const lootboxId = 123;

    await setLootbox({
      lootboxId,
      inputCollection: itemsContract.address,
      inputCollectionItemIds,
      inputCollectionItemAmounts,
      outputCollection: itemsContract.address,
      outputCollectionItemIds,
      outputCollectionItemAmounts,
      outputCollectionItemWeights,
      outputTotalItems,
      canMint: true,
    });

    const lootbox = await lootboxManagerContract.lootbox(lootboxId);

    expect(lootbox.id * 1).to.equal(lootboxId);
    expect(lootbox.inputCollection).to.equal(itemsContract.address);

    for (let i = 0; i < lootbox.inputCollectionItemIds.length; i++) {
      expect(lootbox.inputCollectionItemIds[i] * 1).to.equal(inputCollectionItemIds[i]);
    }

    for (let i = 0; i < lootbox.inputCollectionItemAmounts.length; i++) {
      expect(lootbox.inputCollectionItemAmounts[i] * 1).to.equal(inputCollectionItemAmounts[i]);
    }

    expect(lootbox.outputCollection).to.equal(itemsContract.address);

    for (let i = 0; i < lootbox.outputCollectionItemIds.length; i++) {
      expect(lootbox.outputCollectionItemIds[i] * 1).to.equal(outputCollectionItemIds[i]);
    }

    for (let i = 0; i < lootbox.outputCollectionItemAmounts.length; i++) {
      expect(lootbox.outputCollectionItemAmounts[i] * 1).to.equal(outputCollectionItemAmounts[i]);
    }

    for (let i = 0; i < lootbox.outputCollectionItemWeights.length; i++) {
      expect(lootbox.outputCollectionItemWeights[i] * 1).to.equal(outputCollectionItemWeights[i]);
    }

    expect(lootbox.outputTotalItems).to.equal(outputTotalItems);
    expect(lootbox.lastUpdatedAt * 1).to.not.equal(0);
  });

  it('Should get all lootbox ids, lootboxes, lootbox last updates', async () => {
    const lootboxId = 125;

    await setGenericLootbox({
      lootboxId,
      inputCollectionItemIds: [ 5 ],
      outputCollectionItemIds: [ 1, 2, 3, 4 ],
      outputTotalItems: 2,
      canMint: true,
    });

    const lootboxIds = await lootboxManagerContract.allLootboxIds();
    const lootboxes = await lootboxManagerContract.allLootboxes();
    const lootboxLastUpdates = await lootboxManagerContract.allLootboxLastUpdates();

    expect(lootboxIds.length).to.equal(1);
    expect(lootboxIds[0] * 1).to.equal(lootboxId);

    expect(lootboxes.length).to.equal(1);
    expect(lootboxes[0].id * 1).to.equal(lootboxId);

    expect(lootboxLastUpdates.length).to.equal(1);
    expect(lootboxLastUpdates[0][0] * 1).to.equal(lootboxId);
    expect(lootboxLastUpdates[0][1] * 1).to.not.equal(0);
  });

  it('Should paginate lootboxes, lootboxIds, lootboxLastUpdates', async () => {
    const totalLootboxes = 10;

    for (let i = 0; i < totalLootboxes; i++) {
      await setGenericLootbox({
        lootboxId: i,
        inputCollectionItemIds: [ i * 2 ],
        outputCollectionItemIds: [ i * 7 ],
        outputTotalItems: 5,
        canMint: true,
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500)); // wait
    const lootboxes = await lootboxManagerContract.paginateLootboxes(0, 15); // pagination should not overflow, 15 used to test

    // lootboxes
    expect(lootboxes.length).to.equal(totalLootboxes);

    for (let i = 0; i < totalLootboxes; i++) {
      expect(lootboxes[i].id * 1).to.equal(i);
    }

    // lootbox ids
    const lootboxIds = await lootboxManagerContract.paginateLootboxIds(0, 15);

    expect(lootboxIds.length).to.equal(totalLootboxes);

    for (let i = 0; i < totalLootboxes; i++) {
      expect(lootboxIds[i] * 1).to.equal(i);
    }

    // lootbox last updates
    const lootboxLastUpdates = await lootboxManagerContract.paginateLootboxLastUpdates(0, 15);

    expect(lootboxLastUpdates.length).to.equal(totalLootboxes);

    for (let i = 0; i < totalLootboxes; i++) {
      expect(lootboxLastUpdates[i].length).to.equal(2);
    }
  });

  it('Should remove lootboxes', async () => {
    const lootboxId = 125;

    await setGenericLootbox({
      lootboxId,
      inputCollectionItemIds: [ 5 ],
      outputCollectionItemIds: [ 1, 2, 3, 4 ],
      outputTotalItems: 2,
      canMint: true,
    });

    expect((await lootboxManagerContract.lootbox(lootboxId)).id * 1).to.equal(lootboxId);
    expect(await lootboxManagerContract.totalLootboxes() * 1).to.equal(1);

    await lootboxManagerContract.removeLootbox(lootboxId);

    expect(await lootboxManagerContract.totalLootboxes() * 1).to.equal(0);

    await expect(lootboxManagerContract.lootbox(lootboxId)).to.be.reverted;
  });

  it('Should open/claim lootbox, mints items and increments opens', async () => {
    const lootboxId = 521;
    const lootboxItemId = 1;

    await setGenericLootbox({
      lootboxId,
      inputCollectionItemIds: [ lootboxItemId ],
      outputCollectionItemIds: [ 2, 3, 4, 5 ],
      outputTotalItems: 10,
      canMint: true,
    });

    const user = otherAddresses[0];
    const lootbox = await lootboxManagerContract.lootbox(lootboxId);

    // mint & open
    await itemsContract.mintToAddress(user.address, lootboxItemId, 1);
    await itemsContract.connect(user).setApprovalForAll(lootboxManagerContract.address, true);
    await lootboxManagerContract.setClaimableBlockOffset(2); // 2 blocks to claim
    await lootboxManagerContract.connect(user).openLootbox(lootboxId);
    expect(await itemsContract.balanceOf(user.address, lootboxId) * 1).to.equal(0);
    expect(await lootboxManagerContract.totalOpenedLootboxes(user.address, lootboxId) * 1).to.equal(1);

    // should fail to claim before block incrementation, claim attempt bumps block +1 in test
    await expect(lootboxManagerContract.connect(user).claimLootbox(lootboxId, 0)).to.be.reverted;

    // increment block, block bump +1, total of 2, now claimable.
    await ethers.provider.send('evm_mine');

    // claim
    expect(await lootboxManagerContract.totalClaimableLootboxes(user.address, lootboxId) * 1).to.equal(1);
    await lootboxManagerContract.connect(user).claimLootboxes(lootboxId);

    // check results
    expect((await lootboxManagerContract.lootbox(lootboxId)).opens * 1).to.equal(1);

    const openedLootboxes = await lootboxManagerContract.allOpenedLootboxes(user.address, lootboxId);
    const openedLootbox = openedLootboxes[0];
    const itemIds = [];
    const itemsReceived = {};

    for (let i = 0; i < openedLootbox.outputCollectionItemIds.length; i++) {
      const itemId = openedLootbox.outputCollectionItemIds[i] * 1;
      const amount = openedLootbox.outputCollectionItemAmounts[i] * 1;

      if (!itemIds.includes(itemId)) {
        itemIds.push(itemId);
      }

      itemsReceived[itemId] = itemsReceived[itemId] ? itemsReceived[itemId] + amount : amount;
    }

    const userInventory = (await itemsContract.balanceOfAll(user.address)).reduce((inventory, item) => {
      inventory[item[0] * 1] = item[1] * 1;

      return inventory;
    }, {});

    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      expect(itemsReceived[itemId]).to.equal(userInventory[itemId]);
    }
  });

  it('Should open/claim lootbox, transfer items and increments opens', async () => {
    const lootboxId = 521;
    const lootboxItemId = 1;

    await setGenericLootbox({
      lootboxId,
      inputCollectionItemIds: [ lootboxItemId ],
      outputCollectionItemIds: [ 12, 13 ],
      outputTotalItems: 2,
      canMint: false,
    });

    const user = otherAddresses[0];
    const lootbox = await lootboxManagerContract.lootbox(lootboxId);

    // mint & open
    await itemsContract.mintToAddress(user.address, lootboxItemId, 1);
    await itemsContract.mintToAddress(lootboxManagerContract.address, 12, 10);
    await itemsContract.mintToAddress(lootboxManagerContract.address, 13, 10);
    await itemsContract.connect(user).setApprovalForAll(lootboxManagerContract.address, true);
    await lootboxManagerContract.setClaimableBlockOffset(2); // 2 blocks to claim
    await lootboxManagerContract.connect(user).openLootbox(lootboxId);
    expect(await itemsContract.balanceOf(user.address, lootboxId) * 1).to.equal(0);
    expect(await lootboxManagerContract.totalOpenedLootboxes(user.address, lootboxId) * 1).to.equal(1);

    // should fail to claim before block incrementation, claim attempt bumps block +1 in test
    await expect(lootboxManagerContract.connect(user).claimLootbox(lootboxId, 0)).to.be.reverted;

    // increment block, block bump +1, total of 2, now claimable.
    await ethers.provider.send('evm_mine');

    // claim
    expect(await lootboxManagerContract.totalClaimableLootboxes(user.address, lootboxId) * 1).to.equal(1);
    await lootboxManagerContract.connect(user).claimLootboxes(lootboxId);

    // check results
    expect((await lootboxManagerContract.lootbox(lootboxId)).opens * 1).to.equal(1);

    const openedLootboxes = await lootboxManagerContract.allOpenedLootboxes(user.address, lootboxId);
    const openedLootbox = openedLootboxes[0];
    const itemIds = [];
    const itemsReceived = {};

    for (let i = 0; i < openedLootbox.outputCollectionItemIds.length; i++) {
      const itemId = openedLootbox.outputCollectionItemIds[i] * 1;
      const amount = openedLootbox.outputCollectionItemAmounts[i] * 1;

      if (!itemIds.includes(itemId)) {
        itemIds.push(itemId);
      }

      itemsReceived[itemId] = itemsReceived[itemId] ? itemsReceived[itemId] + amount : amount;
    }

    const userInventory = (await itemsContract.balanceOfAll(user.address)).reduce((inventory, item) => {
      inventory[item[0] * 1] = item[1] * 1;
      return inventory;
    }, {});

    const contractInventory = (await itemsContract.balanceOfAll(lootboxManagerContract.address)).reduce((inventory, item) => {
      inventory[item[0] * 1] = item[1] * 1;
      return inventory;
    }, {});

    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      expect(itemsReceived[itemId]).to.equal(userInventory[itemId]); // test balance
      expect(contractInventory[itemId]).to.equal(10 - userInventory[itemId]); // test transfer
    }
  });

  it('Fails to use offer when sender does not have the required item(s)', async () => {
    const lootboxId = 521;
    const user = otherAddresses[0];

    await setGenericLootbox({
      lootboxId,
      inputCollectionItemIds: [ 1 ],
      outputCollectionItemIds: [ 12, 13 ],
      outputTotalItems: 2,
      canMint: false,
    });

    await itemsContract.connect(user).setApprovalForAll(lootboxManagerContract.address, true);
    await expect(lootboxManagerContract.connect(user).openLootbox(lootboxId)).to.be.reverted;
  });

  it('Fails to set lootbox when not owner', async () => {
    const lootboxId = 123;
    const user = otherAddresses[0];

    const args = [
      lootboxId,
      [ itemsContract.address, itemsContract.address ],
      [ [ 1 ], [ 2, 3, 4 ] ],
      [ [ 1 ], [ 1, 1, 1 ] ],
      [ 5, 10, 15 ],
      1,
    ];

    await expect(lootboxManagerContract.connect(user).setLootbox(...args)).to.be.reverted;
  })

  it('Fails to remove offer when not owner', async () => {
    const lootboxId = 521;
    const user = otherAddresses[0];

    await setGenericLootbox({
      lootboxId,
      inputCollectionItemIds: [ 1 ],
      outputCollectionItemIds: [ 12, 13 ],
      outputTotalItems: 2,
      canMint: false,
    });

    await expect(lootboxManagerContract.connect(user).removeLootbox(lootboxId)).to.be.reverted;
  });

  /*
   * Gasless Transaction Tests
   */

  it('Should cover spender gas fees when submitting transactions to forwarder', async () => {
    const chainId = 31337; // hardhat
    const sender = otherAddresses[1];
    const lootboxId = 5;

    await setGenericLootbox({
      lootboxId,
      inputCollectionItemIds: [ 1 ],
      outputCollectionItemIds: [ 15, 16, 17 ],
      outputTotalItems: 1,
      canMint: true,
    });

    await itemsContract.mintToAddress(sender.address, 1, 1);
    await itemsContract.connect(sender).setApprovalForAll(lootboxManagerContract.address, true);

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

    // sign request to open
    const openForwardRequest = {
      from: sender.address,
      to: lootboxManagerContract.address,
      value: 0,
      gas: await lootboxManagerContract.connect(sender).estimateGas.openLootbox(lootboxId),
      nonce: 41,
      data: lootboxManagerContract.interface.encodeFunctionData('openLootbox', [ lootboxId ]),
    };

    const openSignature = await sender._signTypedData(domain, types, openForwardRequest);

    // execute request to open
    const externalAccount = owner;
    const startingExternalAccountBalance = await externalAccount.getBalance() * 1;

    await forwarderContract.connect(externalAccount).execute(openForwardRequest, openSignature);
    expect(await externalAccount.getBalance() * 1).to.be.below(startingExternalAccountBalance);
    expect(await itemsContract.balanceOf(sender.address, 1)).to.equal(0);

    // attempt to re-execute open request, it should fail since the nonce is used
    await expect(
      forwarderContract.connect(externalAccount).execute(
        openForwardRequest,
        openSignature,
      )
    ).to.be.reverted;

    // sign request to claim
    const claimForwardRequest = {
      from: sender.address,
      to: lootboxManagerContract.address,
      value: 0,
      gas: await lootboxManagerContract.connect(sender).estimateGas.claimLootboxes(lootboxId),
      nonce: 42,
      data: lootboxManagerContract.interface.encodeFunctionData('claimLootboxes', [ lootboxId ]),
    };

    const claimSignature = await sender._signTypedData(domain, types, claimForwardRequest);

    // execute request to claim
    await forwarderContract.connect(externalAccount).execute(claimForwardRequest, claimSignature);
  });

  it('Should properly upgrade trusted forwarder', async () => {
    await lootboxManagerContract.upgradeTrustedForwarder(otherAddresses[1].address);
    expect(await lootboxManagerContract.isTrustedForwarder(otherAddresses[1].address)).to.equal(true);
  });

  it('Fails to upgrade trusted forwarder if not owner', async () => {
    await expect(lootboxManagerContract.connect(otherAddresses[0]).upgradeTrustedForwarder(
      otherAddresses[1].address,
    )).to.be.reverted;
  });

  /**
   * Helpers
   */

  async function setLootbox({
    lootboxId,
    inputCollection,
    inputCollectionItemIds,
    inputCollectionItemAmounts,
    outputCollection,
    outputCollectionItemIds,
    outputCollectionItemAmounts,
    outputCollectionItemWeights,
    outputTotalItems,
    canMint = false,
  }) {
    if (canMint) {
      await itemsContract.grantRole(ethers.utils.id("METAFAB_MINTER_ROLE"), lootboxManagerContract.address);
    }

    return lootboxManagerContract.setLootbox(
      lootboxId,
      [ inputCollection, outputCollection ],
      [ inputCollectionItemIds, outputCollectionItemIds ],
      [ inputCollectionItemAmounts, outputCollectionItemAmounts ],
      outputCollectionItemWeights,
      outputTotalItems,
    );
  }

  async function setGenericLootbox({
    lootboxId,
    inputCollectionItemIds,
    outputCollectionItemIds,
    outputTotalItems,
    canMint,
  }) {
    return setLootbox({
      lootboxId,
      inputCollection: itemsContract.address,
      inputCollectionItemIds,
      inputCollectionItemAmounts: inputCollectionItemIds.map(i => 1),
      outputCollection: itemsContract.address,
      outputCollectionItemIds,
      outputCollectionItemAmounts: outputCollectionItemIds.map(i => 1),
      outputCollectionItemWeights: outputCollectionItemIds.map(i => 1),
      outputTotalItems,
      canMint,
    })
  }
});
