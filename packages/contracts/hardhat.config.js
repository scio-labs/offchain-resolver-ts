require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("@nomicfoundation/hardhat-verify");
require("hardhat-ignore-warnings");
require("dotenv").config();

real_accounts = undefined;
if (process.env.DEPLOYER_KEY) {
  real_accounts = [process.env.DEPLOYER_KEY];
}
const gatewayurl = process.env.REMOTE_GATEWAY || "http://localhost:8080/";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  warnings: {
    "@ensdomains/**/*": "off",
  },
  sourcify: {
    enabled: true,
  },
  networks: {
    hardhat: {
      throwOnCallFailures: false,
      gatewayurl,
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      tags: ["test", "gateway"],
      chainId: 11155111,
      accounts: real_accounts,
      gatewayurl,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      tags: ["gateway"],
      chainId: 1,
      accounts: real_accounts,
      gatewayurl,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    signer: {
      default: process.env.SIGNER_ADDR,
    },
  },
};
