const { ethers, run } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments, network }) => {
  const { deploy } = deployments;
  const { deployer, signer } = await getNamedAccounts();
  if (!network.config.gatewayurl) {
    throw "gatewayurl is missing on hardhat.config.js";
  }

  const args = [network.config.gatewayurl, [signer]];
  console.log("Constructor arguments:", args);

  console.log("Deploying OffchainResolver…");
  const { address } = await deploy("OffchainResolver", {
    from: deployer,
    args,
    log: true,
  });

  console.log("Verifying contract…");
  await run("verify:verify", {
    address,
    constructorArguments: args,
  });
};
module.exports.tags = ["test", "gateway"];
