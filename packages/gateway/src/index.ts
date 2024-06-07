import { makeApp } from './server';
import { readFileSync } from 'fs';
import { ethers } from 'ethers';
import { JSONDatabase } from './json';

const ttl = process.env.TTL ?? '300'
const port = process.env.PORT ?? '8080'
const data = process.env.DATA

let privateKey: any = process.env.PRIVATE_KEY

if (!privateKey || !data) {
  throw Error('One or more of the environment variables were not set');
}

if (privateKey.startsWith('@')) {
  privateKey = ethers.utils.arrayify(
    readFileSync(privateKey.slice(1), { encoding: 'utf-8' })
  );
}

// This is mostly for debugging purposes so we can see if env variables are set as expected by the deployer
console.log(`\nttl: ${ttl}`)
console.log(`port: ${port}\n`)

const address = ethers.utils.computeAddress(privateKey);
const signer = new ethers.utils.SigningKey(privateKey);
const db = JSONDatabase.fromFilename(data, parseInt(ttl));
const app = makeApp(signer, '/', db);

console.log(`Serving on port ${port} with signing address ${address}`);

app.listen(parseInt(port));

module.exports = app;
