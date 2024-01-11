// @ts-nocheck
import fastify from "fastify";
import {ethers} from "ethers";
import {SQLiteDatabase} from "./sqlite";
import fs from 'fs';

import {CONTRACT_CONFIG, PATH_TO_CERT, PRIVATE_KEY, SQLite_DB_FILE} from "./constants";

import cors from '@fastify/cors';
import {getTokenBoundAccount} from "./tokenBound";

const address: string = ethers.computeAddress(PRIVATE_KEY);
const signer: ethers.SigningKey = new ethers.SigningKey(PRIVATE_KEY);

const db: SQLiteDatabase = new SQLiteDatabase(
  SQLite_DB_FILE, // e.g. 'ensnames.db'
);

const provider = new ethers.JsonRpcProvider('https://ethereum-goerli.publicnode.com');
const testContractAddress = '0x2483e332d97C9DaeA4508c1C4F5BEE4a90469229';

console.log(`Path to Cert: ${PATH_TO_CERT}`);

var app;

if (PATH_TO_CERT) {
  app = fastify({
    maxParamLength: 1024,
    https: {
      key: fs.readFileSync('./privkey.pem'),
      cert: fs.readFileSync('./cert.pem')
    }
  });
} else {
  console.log("No Cert");
  app = fastify({
    maxParamLength: 1024
  });
}

await app.register(cors, {
  origin: true
})

const testCatsContract = new ethers.Contract(testContractAddress, [
  'function ownerOf(uint256 tokenId) view returns (address)'
], provider);

app.get('/checkname/:name', async (request, reply) => {
  const name = request.params.name;
  if (!db.checkAvailable(name)) {
    return "unavailable";
  } else {
    return "available";
  }
});

// input: tokenbound address
app.get('/name/:address', async (request, reply) => {
  const address = request.params.address;
  return db.getNameFromAddress(address)
});

app.get('/addr/:name', async (request, reply) => {
  const name = request.params.name;
  return db.addr(name)
});

app.post('/:chainId/:tokenContract/:tokenId/:name/:tbaAccount/:signature', async (request, reply) => {

  const { chainId, tokenContract, tokenId, name, signature } = request.params;

  const config = CONTRACT_CONFIG[chainId + "-" + tokenContract];

  if (!config)
    return reply.status(400).send("Invalid chain and address combination");

  if (!db.checkAvailable(name))
    return reply.status(403).send("Name Unavailable");

  const applyerAddress = recoverAddress(name, tokenId, signature);
  console.log("APPLY: " + applyerAddress);

  //now determine if user owns the NFT
  const userOwns = userOwnsNFT(applyerAddress, tokenId);

  if (userOwns) {

    const tbaAccount = getTokenBoundAccount(chainId, tokenContract, tokenId);

    console.log("TBA: " + tbaAccount);

    try {
      db.addElement(config.baseName, name, tbaAccount, parseInt(chainId));
      return reply.status(200);
    } catch (e){
      return reply.status(400).send(e.message);
    }
  } else {
    return reply.status(403).send("User does not own the NFT or signature is invalid");
  }
});

function recoverAddress(catName: string, tokenId: string, signature: string): string {
  const message = `Registering your catId ${tokenId} name to ${catName}`;
  console.log("MSG: " + message);
  return ethers.verifyMessage(message, addHexPrefix(signature));
}

async function userOwnsNFT(applyerAddress: string, tokenId: string): Promise<boolean> {
  const owner = await testCatsContract.ownerOf(tokenId);
  console.log("Owner: " + owner);
  if (owner === applyerAddress) {
    console.log("Owns");
    return true;
  } else {
    console.log("Doesn't own");
    return false;
  }
}

function addHexPrefix(hex: string): string {
  if (hex.startsWith('0x')) {
      return hex;
  } else {
      return '0x' + hex;
  }
}

/*async function genSig() {
  // The message you want to sign

  const message = 'gonzo2,134';

  const wallet = new ethers.Wallet(PRIVATE_KEY);

  //let signature = await signer.sign( "YOLESS" );

  

  // Sign the message
  const signature = await wallet.signMessage(message);

  console.log(signature);

  const signerAddress = ethers.verifyMessage(message, signature);

  console.log(`Recovered address: ${signerAddress}`);
}*/

const start = async () => {

  try {
    await app.listen({ port: 8083, host: '0.0.0.0' });
    console.log(`Server is listening on ${app.server?.address().port}`);
  } catch (err) {
    console.log(err);
    app.log.error(err);
    process.exit(1);
  }
};

start();