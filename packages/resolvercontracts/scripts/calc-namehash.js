const { ethers } = require("hardhat");
const { createWalletsAndAddresses, ethersDebugMessages } = require('./inc/libGoerli');

(async ()=>{
    const {
        mainDeployKey,
        goerliKey
    } = await createWalletsAndAddresses(ethers.provider);

    console.log("Deploy key: " + mainDeployKey.address);
    console.log("GOERLI key: " + goerliKey.address);

    const mainnetENSRegistry = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"; //same as on goerli

    const goerliResolver = "0x763fD665d7081404c6BfEC5837A4E90c423eE522";

    //resolver contract

    const prodUrl = "https://ens-gate.main.smartlayer.network/{sender}/{data}.json";
    const testUri = "https://ens-gate.test.smartlayer.network/{sender}/{data}.json";
    const localTestUri = "http://44.217.178.162:8082/{sender}/{data}.json";

    const signerProd = "0x9c4171b69E5659647556E81007EF941f9B042b1a"; 
    const signerTest = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";


    const smartcatNode = ethers.utils.namehash('smartcat.eth');
    const thesmartcatsNode = ethers.utils.namehash('thesmartcats.eth');


    const CustomResolver2 = await ethers.getContractFactory("OffchainResolver");
    let customResolver = await CustomResolver2.attach("0xa358d5c754b1Df190Aace3fead09798768c69A10");

    let newUrl = await customResolver.connect(goerliKey).url();
    console.log("URL: " + newUrl);


    //

    //first deploy the custom resolver:
    /*const CustomResolver = await ethers.getContractFactory("OffchainResolver");
    let customResolver = await CustomResolver.connect(mainDeployKey).deploy(localTestUri, [signerTest]);
    await customResolver.deployed();*/

    console.log(`New Resolver Addr : ${customResolver.address}`);
    let localResolverAddr = customResolver.address;

    //Do not so this on prod
    //const Registry = await ethers.getContractFactory('ENSRegistry'); 
    //let registry = await Registry.connect(mainDeployKey).deploy();
    //await registry.deployed();

    //hook onto registry
    //const AttestationMintable = await ethers.getContractFactory("AttestationMintable");
    //const mintableNFTTokens = await AttestationMintable.attach(deployedRinkebyContract);

    //await mintableNFTTokens.connect(rinkebyDeployKey).updateBaseURL(newMetadataBase); //must use same key as contract deployment

    console.log(`SmartCat Node: ${ethers.utils.namehash('smartcat.eth')}`  );
    console.log(`TheSmartCats Node: ${ethers.utils.namehash('thesmartcats.eth')}`  );
    console.log(`TheSmartCat Node: ${ethers.utils.namehash('thesmartcat.eth')}`  );

    ensOwner = await registry.connect(goerliKey).owner(thesmartcatsNode);
    console.log("Owner: " + ensOwner);

    resolverAddr = await registry.connect(goerliKey).resolver(thesmartcatsNode);
    console.log("Resolver: " + resolverAddr);

    //set resolver
    //let updateResolverTx = await registry.connect(goerliKey).setResolver(smartcatNode, localResolverAddr);
    //await updateResolverTx.wait();

    resolverAddr = await registry.connect(goerliKey).resolver(smartcatNode);
    console.log("Resolver: " + resolverAddr);

})();
// npx hardhat run scripts/calc-namehash.js --network goerli