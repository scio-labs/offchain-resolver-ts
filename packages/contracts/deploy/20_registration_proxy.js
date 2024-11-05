const { ethers, run } = require('hardhat')

module.exports = async ({ getNamedAccounts, deployments, network }) => {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  if (!network.config.holdPeriod) {
    throw "holdPeriod is missing on hardhat.config.js";
  }

  const args = [network.config.holdPeriod];
  console.log("Constructor arguments:", args);

  console.log("Deploying RegistrationProxy");
  const { address } = await deploy("RegistrationProxy", {
    from: deployer,
    args,
    log: true,
  });

  console.log('Verifying contract…')
  await run('verify:verify', {
    address,
    constructorArguments: args,
  })
}
module.exports.tags = ['relayer']
