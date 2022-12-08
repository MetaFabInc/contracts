const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = ethers;

const abiCoder = ethers.utils.defaultAbiCoder;

describe('System_Delegate_Approvals', () => {
  const systemId = ethers.utils.id('214124-12u51u2-521512');

  let systemDelegateApprovalsAddress;
  let systemDelegateApprovalsContract;
  let owner;
  let delegate;
  let otherAddresses;

  beforeEach(async () => {
    const [ _owner, _delegate, ..._otherAddresses ] = await ethers.getSigners();

    const System_Delegate_Approvals = await ethers.getContractFactory('System_Delegate_Approvals');

    owner = _owner;
    delegate = _delegate;
    otherAddresses = _otherAddresses;

    systemDelegateApprovalsContract = await System_Delegate_Approvals.deploy();
    systemDelegateApprovalsAddress = systemDelegateApprovalsContract.address;
  });

  /*
   * General Tests
   */

  it('Should deploy', async () => {
    await systemDelegateApprovalsContract.deployed();
  });

  it('Should set delegate approval for system', async () => {
    await systemDelegateApprovalsContract.connect(otherAddresses[1]).setDelegateApprovalForSystem(systemId, delegate.address, true);

    expect(await systemDelegateApprovalsContract.isDelegateApprovedForSystem(otherAddresses[1].address, systemId, delegate.address)).to.equal(true);
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

    await systemDelegateApprovalsContract.connect(otherAddresses[1]).setDelegateApprovalForSystemBySignature(...args, signature);

    expect(await systemDelegateApprovalsContract.isDelegateApprovedForSystem(signer.address, systemId, delegate.address)).to.equal(true);
  });
});
