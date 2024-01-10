// @ts-nocheck
import fastify from "fastify";
import { ethers } from "ethers";
import { SQLiteDatabase } from "./sqlite";
import fs from 'fs';
import https from 'https';

import { PRIVATE_KEY, SQLite_DB_FILE, PATH_TO_CERT } from "./constants";

import cors from '@fastify/cors';

const address: string = ethers.computeAddress(PRIVATE_KEY);
const signer: ethers.SigningKey = new ethers.SigningKey(PRIVATE_KEY);

const db: SQLiteDatabase = new SQLiteDatabase(
  SQLite_DB_FILE, // e.g. 'ensnames.db'
);

const provider = new ethers.JsonRpcProvider('https://ethereum-goerli.publicnode.com');
const testContractAddress = '0x2483e332d97C9DaeA4508c1C4F5BEE4a90469229';

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
  const nameFromAddress = db.getNameFromAddress(address);
  return nameFromAddress
});

app.get('/addr/:name', async (request, reply) => {
  const name = request.params.name;
  const addressFromName = db.addr(name);
  return addressFromName
});

app.post('/:name/:tokenId/:tbaAccount/:signature', async (request, reply) => {
  const { name, tokenId, tbaAccount, signature } = request.params;
  if (!db.checkAvailable(name)) {
    return "Fail: Name Unavailable";
  } else {
    // do ecrecover
    try {
    const applyerAddress = await recoverAddress(name, tokenId, signature);
    console.log("APPLY: " + applyerAddress);
    //now determine if user owns the NFT
    const userOwns = await userOwnsNFT(applyerAddress, tokenId);
    if (userOwns) {
      console.log("TBA: " + tbaAccount);
      const retVal: string = db.addElement(name, tbaAccount);
      return "pass";
    } else {
      return "fail: User does not own NFT";
    }
    // const retVal: string = db.addElement(name, tbaAccount);
    // return "pass";
  } catch (error) {
    return "Fail: invalid signature";
  }
  }
});

async function recoverAddress(catName: string, tokenId: string, signature: string): string {
  const message = `Registering your catId ${tokenId} name to ${catName}`;
  console.log("MSG: " + message);
  const signerAddress = ethers.verifyMessage(message, addHexPrefix(signature));
  return signerAddress;
}

async function userOwnsNFT(applyerAddress: string, tokenId: string): boolean {
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