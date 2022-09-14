try {
  require("@nomicfoundation/hardhat-toolbox");
} catch (error) {
  console.warn('hardhat-toolbox is not installed. It is only needed for contract tests.');
}

module.exports = {
  solidity: {
    version: '0.8.16',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000000,
      },
    },
  },
  defaultNetwork: 'hardhat',
  networks: {
    homestead: {
      url: 'https://eth-mainnet.g.alchemy.com/v2/hB_gCVHrVyoAiZ1KZG3VOYqKwKPTDufq',
    },
    goerli: {
      url: 'https://eth-goerli.g.alchemy.com/v2/CvXofzR_0SRA5dSgs3yIpP_-REkVezLu',
    },
    polygon: {
      url: 'https://polygon-rpc.com',
    },
    polygonMumbai: {
      url: 'https://polygon-mumbai.g.alchemy.com/v2/3QB9cs5_rdddFKYwFc0M-hzydnS6lhs6',
    },
  },
  abiExporter: {
    path: './abi',
    clear: true,
    flat: true,
    pretty: true,
  },
  etherscan: {
    apiKey: '',
  },
  mocha: {
    timeout: 60 * 60 * 1000,
  },
};
