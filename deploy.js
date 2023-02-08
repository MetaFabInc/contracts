const { ethers } = require('hardhat');
const { Wallet } = ethers;
const { JsonRpcProvider } = ethers.providers;

async function main() {
  const provider = new JsonRpcProvider('');
  const wallet = new Wallet('TODO', provider);
/*
  const DelegateApproverFactory = await ethers.getContractFactory('System_Delegate_Approver', wallet);

  const delegateApproverContract = await DelegateApproverFactory.deploy();

  console.log('tx', delegateApproverContract.deployTransaction.hash);
  await delegateApproverContract.deployed();
  console.log('addr', delegateApproverContract.address);
*/

/*
  const ForwarderFactory = await ethers.getContractFactory('ERC2771_Trusted_Forwarder', wallet);

  const forwarderContract = await ForwarderFactory.deploy('FORWARDER_ADDRESS_INPUT', { gasPrice: ethers.BigNumber.from('100000000000') });

  console.log('tx', forwarderContract.deployTransaction.hash);
  await forwarderContract.deployed();
  console.log('addr', forwarderContract.address);
*/
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit();
  });
