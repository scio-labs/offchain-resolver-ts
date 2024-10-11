import { makeApp } from './server';
import { ethers } from 'ethers';
import { AzeroId } from './azero-id';
import { GasLimit } from './utils';
import { Relayer } from './registration-relayer';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { waitReady } from '@polkadot/wasm-crypto';
import supportedTLDs from './supported-tlds.json';
import dotenv from 'dotenv';

dotenv.config();

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
  const port = parseInt(process.env.PORT || '8080');
  const ttl = parseInt(process.env.TTL || '300');
  const wasmProviderURL =
    process.env.WASM_PROVIDER_URL || 'wss://ws.test.azero.dev';
  const tldToContractAddress = new Map<string, string>(
    Object.entries(supportedTLDs)
  );
  const wasmGasLimit: GasLimit = {
    refTime: 100_000_000_000,
    proofSize: 1_000_000,
  };
  const evmGatewaySigningKey = new ethers.utils.SigningKey(
    process.env.GATEWAY_SIGNER_KEY || ''
  );
  const evmRelayerSigningKey = new ethers.utils.SigningKey(
    process.env.EVM_PRIVATE_KEY || ''
  );
  const evmProvider = ethers.getDefaultProvider(
    process.env.EVM_PROVIDER_URL || 'https://ethereum-sepolia.publicnode.com'
  );
  const evmSigner = new ethers.Wallet(evmRelayerSigningKey, evmProvider);
  const evmRelayerAddr = process.env.EVM_RELAYER_CONTRACT || '';
  const wasmRelayerAddr = process.env.WASM_RELAYER_CONTRACT || '';
  const wasmSigner = await waitReady().then(() =>
    new Keyring({ type: 'sr25519' }).createFromUri(
      process.env.WASM_PRIVATE_KEY || ''
    )
  );
  const bufferDurationInMinutes = parseInt(
    process.env.BUFFER_DURATION_IN_MIN || '10'
  );

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
