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
      url: '',
    },
    goerli: {
      url: '',
    },
    polygon: {
      url: 'https://polygon-rpc.com',
    },
    polygonMumbai: {
      url: '',
    },
    arbitrum: {
      url: '',
    },
    arbitrumNova: {
      url: 'https://nova.arbitrum.io/rpc',
    },
    arbitrumGoerli: {
      url: '',
    },
    thundercore: {
      url: '',
    },
    thundercoreTestnet: {
      url: '',
    },
  },
  abiExporter: {
    path: './abi',
    clear: true,
    flat: true,
    pretty: true,
  },
  etherscan: {
    apiKey: 'VUV9MN1SBXZH9WXBR9PU49H53KZ56KWDYS',
    customChains: [
      {
        network: "arbitrumGoerli",
        chainId: 421613,
        urls: {
          apiURL: "https://api-goerli.arbiscan.io/api",
          browserURL: "https://goerli.arbiscan.io/"
        }
      },
      {
        network: "arbitrumNova",
        chainId: 42170,
        urls: {
          apiURL: 'https://api-nova.arbiscan.io/api',
          browserURL: 'https://nova.arbiscan.io/',
        },
      },
    ]
  },
  mocha: {
    timeout: 60 * 60 * 1000,
  },
};
