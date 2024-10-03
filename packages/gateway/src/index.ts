import { makeApp } from './server';
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { ethers } from 'ethers';
import { AzeroId } from './azero-id';
import { GasLimit } from './utils';
import { Relayer } from './registration-relayer';
import { Keyring } from '@polkadot/keyring';
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
  refTime: 100_000_000_000,
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
}).then(async () => {
  // TODO: make it configurable
  const evmProviderURL = "https://ethereum-sepolia.publicnode.com";
  const evmRelayerAddr = "0x2BaD727319377af238a7F6D166494118Ca9D0497";
  const wasmRelayerAddr = "5GNDka5xV9y9nsES2gqYQponJ8vJaAmoJjMUvrqGqPF65q7P";;
  const wasmProviderURL = options.providerUrl;
  const keyring = new Keyring({ type: 'sr25519' });
  const seed = "0xd5836897dc77e6c87e5cc268abaaa9c661bcf19aea9f0f50a1e149d21ce31eb7"; // public seed
  const wasmSigner = keyring.createFromUri(seed);

  const relayer = await Relayer.init(
    evmProviderURL,
    evmRelayerAddr,
    wasmProviderURL,
    wasmRelayerAddr,
    wasmSigner,
    defaultGasLimit
  );

  relayer.start();
});
