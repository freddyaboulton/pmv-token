require('@nomiclabs/hardhat-waffle');
require('hardhat-gas-reporter');
require('@nomiclabs/hardhat-truffle5');
require("@nomiclabs/hardhat-etherscan");
require('dotenv').config();


const RINKEBY_URI = process.env.RINKEBY_URI ? process.env.RINKEBY_URI : "";
const MAINNET_URI = process.env.MAINNET_URI ? process.env.MAINNET_URI : "";
if (RINKEBY_URI === ""){
  console.log("RINKEBY_URI not set. Cannot deploy");
}
if (MAINNET_URI === ""){
  console.log("MAINNET_URI not set. Cannot deploy");
}


// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: '0.8.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  gasReporter: {
    currency: 'USD',
    coinmarketcap: process.env.COINMARKETCAP_KEY,
  },
  networks: {
    rinkeby: {
      url: RINKEBY_URI,
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`]
    },

    mainnet: {
      url: MAINNET_URI,
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`]
    }
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
