import { Command } from 'commander';
import ethers from 'ethers';
//@ts-ignore
import fetch from 'node-fetch';

const program = new Command();
program
  .requiredOption('-r --registry <address>', 'ENS registry address') //0x4dBFD41eA7639eB5FbC95e4D2Ea63369e7Be143f <<-- resolver, registry is 0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5
  .option('-p --provider <url>', 'web3 provider URL', 'http://127.0.0.1:8545') //https://ethereum-goerli.publicnode.com
  .option('-i --chainId <chainId>', 'chainId', '31337') //5
  .option('-n --chainName <name>', 'chainName', 'hardhat') //Goerli
  .argument('<name>');

program.parse(process.argv);
const options = program.opts();
const ensAddress = options.registry;
const chainId = parseInt(options.chainId);
const chainName = options.chainName;
const provider = new ethers.providers.JsonRpcProvider(options.provider, {
  chainId,
  name: chainName,
  ensAddress,
});

// Define the ENS resolver contract address for now, will add dynamic resolution if needed
//const ensResolverAddress = '0x8464135c8F25Da09e49BC8782676a84730C318bC';
const ensResolverAddress = '0x02957D5823c1C973f2075d870985c856b6D1b93E';

//@ts-ignore
const returnAbi = [
  {
    "constant": false,
    "inputs": [
      {
        "name": "sender",
        "type": "address"
      },
      {
        "name": "urls",
        "type": "string[]"
      },
      {
        "name": "callData",
        "type": "bytes"
      },
      {
        "name": "callbackFunction",
        "type": "bytes4"
      },
      {
        "name": "extraData",
        "type": "bytes"
      }
    ],
    "name": "OffchainLookup",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

//@ts-ignore
const decodeAbi = [
  {
    "constant": true,
    "inputs": [],
    "name": "decode",
    "outputs": [
      {
        "name": "address",
        "type": "bytes"
      },
      {
        "name": "time",
        "type": "uint64"
      },
      {
        "name": "sig",
        "type": "bytes"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];

(async () => {
  const name = program.args[0];
  //let resolver = await provider.getResolver(name); //TODO: This may be updated
  let userAddress = await resolve(name, ensResolverAddress);
  console.log(`UserAddress: ${userAddress}`);

  async function resolve(name: string, resolverAddress: string): Promise<string> {
    const namehash = ethers.utils.namehash(name);
    const dnsEncode = ethers.utils.dnsEncode(name);
    const funcEncode = "0x3b3b57de" + namehash.substring(2);

    const catResolver = new ethers.Contract(resolverAddress, [
      'function resolve(bytes name, bytes data) view returns (bytes)',
      'function resolveWithProof(bytes calldata response, bytes calldata extraData) external view returns(bytes memory)'
    ], provider);

    //call, get error
    try {
      const resolverTx = await catResolver.resolve(dnsEncode, funcEncode);
      console.log(resolverTx);
    } catch (error) {
      //break down the data
      const iface = new ethers.utils.Interface(returnAbi);
      const decoded = iface.decodeFunctionData('OffchainLookup', error.data);
      

      //format URL:
      const callUrl = decoded.urls[0].replace('{sender}', decoded.sender).replace('{data}', decoded.callData);

      try {
        const response = await fetch(callUrl);

        if (response.ok) {
          const data = await response.json();

          //response1
          const proofResponse = data.data;
          const extraData = decoded.extraData;

          //now call proof
          const proofReturn = await catResolver.resolveWithProof(proofResponse, extraData);
          console.log(proofReturn);

          console.log("Len: " + proofReturn.length);
          var truncated = proofReturn;
          if (proofReturn.length > 42) {
            truncated = "0x" + proofReturn.substring(proofReturn.length - 40);
          }

          console.log("Truncated: " + truncated);

          return ethers.utils.getAddress(truncated);
        }
      } catch (callError) {
        // nop, expected
      }
    }

    return ethers.constants.AddressZero;
  }


}

)();


