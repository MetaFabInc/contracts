const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = ethers;

const abiCoder = ethers.utils.defaultAbiCoder;

describe('System_Delegate_Approver', () => {
  const systemId = ethers.utils.id('214124-12u51u2-521512');

  let systemDelegateApproverAddress;
  let systemDelegateApproverContract;
  let owner;
  let delegate;
  let otherAddresses;

  beforeEach(async () => {
    const [ _owner, _delegate, ..._otherAddresses ] = await ethers.getSigners();

    const System_Delegate_Approver = await ethers.getContractFactory('System_Delegate_Approver');

    owner = _owner;
    delegate = _delegate;
    otherAddresses = _otherAddresses;

    systemDelegateApproverContract = await System_Delegate_Approver.deploy();
    systemDelegateApproverAddress = systemDelegateApproverContract.address;
  });

  /*
   * General Tests
   */

  it('Should deploy', async () => {
    await systemDelegateApproverContract.deployed();
  });

  it('Should set delegate approval for system', async () => {
    await systemDelegateApproverContract.connect(otherAddresses[1]).setDelegateApprovalForSystem(systemId, delegate.address, true);

    expect(await systemDelegateApproverContract.isDelegateApprovedForSystem(otherAddresses[1].address, systemId, delegate.address)).to.equal(true);
  });

  it('Should set delegate approval for system by signature', async () => {
    const abiCoder = ethers.utils.defaultAbiCoder;
    const signer = otherAddresses[0];
    const args = [ systemId, delegate.address, true, signer.address, BigNumber.from(53135) ];
    const hash = ethers.utils.keccak256(abiCoder.encode(
      [ 'bytes32', 'address', 'bool', 'address', 'uint256' ],
      args,
    ));

    const signature = await signer.signMessage(ethers.utils.arrayify(hash));

    await systemDelegateApproverContract.connect(otherAddresses[1]).setDelegateApprovalForSystemBySignature(...args, signature);

    expect(await systemDelegateApproverContract.isDelegateApprovedForSystem(signer.address, systemId, delegate.address)).to.equal(true);
  });
});
