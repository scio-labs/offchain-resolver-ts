// @ts-nocheck
import fastify from "fastify";
import { ethers } from "ethers";
import { JSONDatabase } from "./json";
import { PRIVATE_KEY, JSON_DB_FILE } from "./constants";

const address: string = ethers.computeAddress(PRIVATE_KEY);
const signer: ethers.SigningKey = new ethers.SigningKey(PRIVATE_KEY);
const db: JSONDatabase = JSONDatabase.fromFilename(
  JSON_DB_FILE,
  10
);

const provider = new ethers.JsonRpcProvider('https://ethereum-goerli.publicnode.com');

const testContractAddress = '0x2483e332d97C9DaeA4508c1C4F5BEE4a90469229';

const app = fastify({
  maxParamLength: 1024
});

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

app.get('/:name/:tokenId/:signature', async (request, reply) => {
  const { name, tokenId, signature } = request.params;
  // first check if name is taken
  if (!db.checkAvailable(name)) {
    return "Fail: Name Unavailable";
  } else {
    // do ecrecover
    const applyerAddress = await recoverAddress(name, tokenId, signature);
    console.log("APPLY: " + applyerAddress);
    //now determine if user owns the NFT
    const userOwns = await userOwnsNFT(applyerAddress, tokenId);
    if (userOwns) {
      return "pass";
    } else {
      return "fail: User does not own NFT";
    }
  }
});

async function recoverAddress(catName: string, tokenId: string, signature: string): string {
  const message = `Registering your catId ${tokenId} name to ${catName}`;
  console.log("MSG: " + message);
  const signerAddress = ethers.verifyMessage(message, signature);
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
    await app.listen({ port: 8083 });
    console.log(`Server is listening on ${app.server?.address().port}`);
  } catch (err) {
    console.log(err);
    app.log.error(err);
    process.exit(1);
  }
};

start();