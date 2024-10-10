import { makeApp } from './server';
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { ethers } from 'ethers';
import { AzeroId } from './azero-id';
import { GasLimit } from './utils';
import { Relayer } from './registration-relayer';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import supportedTLDs from './supported-tlds.json';

const program = new Command();
program
  .requiredOption(
    '-k --private-key <key>',
    'Private key to sign responses with. Prefix with @ to read from a file'
  )
  .option(
    '--provider-url <string>',
    'Provider URL of the substrate chain',
    'wss://ws.test.azero.dev'
  )
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

async function gateway(
  port: number,
  ttl: number,
  wasmProviderURL: string,
  tldToContractAddress: Map<string, string>,
  wasmGasLimit: GasLimit,
  evmSigningKey: ethers.utils.SigningKey
) {
  const db = await AzeroId.init(
    ttl,
    wasmProviderURL,
    tldToContractAddress,
    wasmGasLimit
  );

  const app = makeApp(evmSigningKey, '/', db);
  const address = ethers.utils.computeAddress(evmSigningKey.privateKey);
  console.log(`Serving on port ${port} with signing address ${address}`);
  app.listen(port);
}

async function relayer(
  evmSigner: ethers.Signer,
  evmRelayerAddr: string,
  wasmProviderURL: string,
  wasmRelayerAddr: string,
  wasmSigner: KeyringPair,
  wasmGasLimit: GasLimit,
  bufferDurationInMinutes: number
) {
  const relayer = await Relayer.init(
    evmSigner,
    evmRelayerAddr,
    wasmProviderURL,
    wasmRelayerAddr,
    wasmSigner,
    wasmGasLimit,
    bufferDurationInMinutes
  );

  relayer.start();
}

async function main() {
  const port = parseInt(options.port);
  const ttl = parseInt(options.ttl);
  const wasmProviderURL = options.providerUrl;
  const tldToContractAddress = new Map<string, string>(
    Object.entries(supportedTLDs)
  );
  const wasmGasLimit: GasLimit = {
    refTime: 100_000_000_000,
    proofSize: 1_000_000,
  };
  const evmGatewaySigningKey = new ethers.utils.SigningKey(privateKey);
  const evmRelayerSigningKey = new ethers.utils.SigningKey(privateKey);
  const evmProviderURL = 'https://ethereum-sepolia.publicnode.com';
  const evmProvider = ethers.getDefaultProvider(evmProviderURL);
  const evmSigner = new ethers.Wallet(evmRelayerSigningKey, evmProvider);
  const evmRelayerAddr = '0x2BaD727319377af238a7F6D166494118Ca9D0497';
  const wasmRelayerAddr = '5GNDka5xV9y9nsES2gqYQponJ8vJaAmoJjMUvrqGqPF65q7P';
  const wasmPrivateKey =
    '0xd5836897dc77e6c87e5cc268abaaa9c661bcf19aea9f0f50a1e149d21ce31eb7'; // public seed
  const wasmSigner = new Keyring({ type: 'sr25519' }).createFromUri(
    wasmPrivateKey
  );
  const bufferDurationInMinutes = 10;

  await gateway(
    port,
    ttl,
    wasmProviderURL,
    tldToContractAddress,
    wasmGasLimit,
    evmGatewaySigningKey
  );

  await relayer(
    evmSigner,
    evmRelayerAddr,
    wasmProviderURL,
    wasmRelayerAddr,
    wasmSigner,
    wasmGasLimit,
    bufferDurationInMinutes
  );
}

main();
