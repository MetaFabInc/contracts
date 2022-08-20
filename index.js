const fs = require('fs');

const contracts = {};

const recurseContracts = rootDirectory => {
  const directoryItems = fs.readdirSync(rootDirectory);

  for (let i = 0; i < directoryItems.length; i++) {
    const directoryItem = directoryItems[i];
    const itemPath = `${rootDirectory}/${directoryItem}`;

    if (fs.lstatSync(itemPath).isDirectory()) {
      recurseContracts(itemPath);
    }

    if (directoryItem.includes('.json') && !directoryItem.includes('.dbg.json')) {
      const contractName = directoryItem.replace('.json', '');

      contracts[contractName] = require(itemPath);
    }
  }
}

recurseContracts('./artifacts/contracts');

module.exports = contracts;
