/*
const { ethers } = require('hardhat');
const { Wallet } = ethers;
const { JsonRpcProvider } = ethers.providers;

async function main() {
  const provider = new JsonRpcProvider('https://polygon-mainnet.g.alchemy.com/v2/AwxZrUnUtg4-ZdmGtYDLrNcPXI62RXj5');
  const wallet = new Wallet('0x38e8c46b1f6cec97c16d02d9a159ce327fbd2b2bf6a8b47094fd9522ae93968b', provider);

  const ForwarderFactory = await ethers.getContractFactory('ERC2771_Trusted_Forwarder', wallet);

  const forwarderContract = await ForwarderFactory.deploy({ gasPrice: ethers.BigNumber.from('100000000000') });

  console.log('tx', forwarderContract.deployTransaction.hash);
  await forwarderContract.deployed();
  console.log('addr', forwarderContract.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit();
  });
*/
