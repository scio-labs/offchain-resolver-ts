import { makeApp } from './server';
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { ethers } from 'ethers';
import { AzeroId } from './azero-id';
import { GasLimit } from './utils';
import supportedTLDs from './supported-tlds.json';

const program = new Command();
program
  .requiredOption(
    '-k --private-key <key>',
    'Private key to sign responses with. Prefix with @ to read from a file'
  )
  .option('--provider-url <string>', 'Provider URL of the substrate chain', 'wss://ws.test.azero.dev')
  .option('-t --ttl <number>', 'TTL for signatures', '300')
  .option('-p --port <number>', 'Port number to serve on', '8080');
program.parse(process.argv);
const options = program.opts();
let privateKey = options.privateKey;
if (privateKey.startsWith('@')) {
  privateKey = ethers.utils.arrayify(
    readFileSync(privateKey.slice(1), { encoding: 'utf-8' })
  );
}
const address = ethers.utils.computeAddress(privateKey);
const signer = new ethers.utils.SigningKey(privateKey);

// TODO: make it configurable
const defaultGasLimit: GasLimit = {
  refTime: 10_000_000_000,
  proofSize: 1_000_000,
};

const tldToContractAddress = new Map<string, string>(Object.entries(supportedTLDs));

AzeroId.init(
  parseInt(options.ttl), 
  options.providerUrl, 
  tldToContractAddress, 
  defaultGasLimit,
).then(db => {
  const app = makeApp(signer, '/', db);
  console.log(`Serving on port ${options.port} with signing address ${address}`);
  app.listen(parseInt(options.port));
});
