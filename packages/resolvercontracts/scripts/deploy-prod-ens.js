const { ethers } = require("hardhat");
const { createWalletsAndAddresses, ethersDebugMessages } = require('./inc/lib');

(async ()=>{
    const {
        mainDeployKey
    } = await createWalletsAndAddresses(ethers.provider);

    console.log("Deploy key: " + mainDeployKey.address);

    const mainnetENSRegistry = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"; //same as on goerli

    //resolver contract

    const prodUrl = "https://ens-gate.main.smartlayer.network/{sender}/{data}.json";

    const signerProd = "0xC9A39015CB7c64c743815E55789ab63A321FB249";
    const mainnetOffchainResolverDeployAddress = "0x6a844646443f29dF2Fd47F92E3520b61F3FC0754";

    console.log("Deploy key: " + mainDeployKey.address); // should be 0x9c4171b69E5659647556E81007EF941f9B042b1a for mainnet

    var isBaseOwned = true;

    const gasPrice = ethers.utils.parseUnits('23', 'gwei'); //Use for manual gas price
    const gasLimit = 2712380; //For contract deployment 
    const gasLimitFunc = 200238; //For resolver update

    // IF ALREADY DEPLOYED
    const CustomResolver = await ethers.getContractFactory("OffchainResolver");
    let customResolver = await CustomResolver.attach(mainnetOffchainResolverDeployAddress);
    
    // To update URL
    //let updateUrl = await customResolver.connect(mainDeployKey).updateUrl(... url goes here);
    //await updateUrl.wait();

    // IF WE WANT TO DEPLOY RESOLVER
    //const CustomResolver = await ethers.getContractFactory("OffchainResolver");
    //let customResolver = await CustomResolver.connect(mainDeployKey).deploy(prodUrl, [signerProd], { gasPrice: auto, gasLimit: gasLimit });
    //await customResolver.deployed();

    const mainNetResolver = customResolver.address;
    console.log("Mainnet resolve: " + mainNetResolver);

    let newUrl = await customResolver.connect(mainDeployKey).url();
    console.log("URL: " + newUrl);

    const thesmartcatsNode = ethers.utils.namehash('thesmartcats.eth');
    console.log("thesmartcats.eth node: " + thesmartcatsNode);

    const Registry = await ethers.getContractFactory('ENSRegistry');
    let registry = await Registry.attach(mainnetENSRegistry);
    let ownerOfNode = await registry.owner(thesmartcatsNode);

    console.log("Node owner: " + ownerOfNode);

    let fetchedResolver = 0;

    if (ownerOfNode != mainDeployKey.address) {
        isBaseOwned = false;

        const NameWrapper = await ethers.getContractFactory('NameWrapperStub');
        let nameWrapper = await NameWrapper.attach(ownerOfNode);
        ownerOfNode = await nameWrapper.ownerOf(thesmartcatsNode);
        
        console.log("Node wrapper owner: " + ownerOfNode);

        if (ownerOfNode == mainDeployKey.address) {
            //point resolver at mainNetResolver, namewrapper will update the resolver on the main registry
            let writeResolver = await nameWrapper.connect(mainDeployKey).setResolver(thesmartcatsNode, mainNetResolver, { gasPrice: auto, gasLimit: gasLimitFunc });
            await writeResolver.wait();
        }
        
    } else {
        //set resolver directly on the registry
        let writeResolver = await registry.connect(mainDeployKey).setResolver(thesmartcatsNode, mainNetResolver, { gasPrice: auto, gasLimit: gasLimitFunc });
        await writeResolver.wait();
    }

    //check resolver
    fetchedResolver = await registry.resolver(thesmartcatsNode);

    console.log("New resolver addr: " + fetchedResolver);
    if (fetchedResolver == mainNetResolver) {
        console.log("Deploy Success");
    } else {
        console.log("Deploy failed, resolver not set");
    }

})();
// npx hardhat run scripts/deploy-prod-ens.js --network mainnet