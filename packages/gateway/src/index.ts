import { Keyring } from '@polkadot/keyring'
import { ethers } from 'ethers'
import { AutoRouter, AutoRouterType } from 'itty-router'
import { privateKeyToAccount } from 'viem/accounts'
import { AzeroIdRelayer } from './azero-id-relayer'
import { AzeroIdResolver } from './azero-id-resolver'
import { makeServer } from './server'

let router: AutoRouterType | undefined
function initRouter(env: any) {
  console.log('Initializing…')

  // Destructure environment variables
  const {
    OG_PRIVATE_KEY,
    SUPPORTED_TLDS,
    OG_TTL,
    AZERO_RPC_URL,
    EVM_RPC_BASE_URL,
    INFURA_API_KEY,
    EVM_RELAYER_CONTRACT,
    WASM_RELAYER_CONTRACT,
    WASM_PRIVATE_KEY,
    EVM_RELAYER_PRIVATE_KEY,
    BUFFER_DURATION_IN_MIN,
  } = env
  if (
    !Object.keys(SUPPORTED_TLDS || {}).length ||
    !OG_PRIVATE_KEY ||
    !OG_TTL ||
    !AZERO_RPC_URL ||
    !EVM_RPC_BASE_URL ||
    !INFURA_API_KEY ||
    !EVM_RELAYER_CONTRACT ||
    !WASM_RELAYER_CONTRACT ||
    !WASM_PRIVATE_KEY ||
    !EVM_RELAYER_PRIVATE_KEY ||
    !BUFFER_DURATION_IN_MIN
  ) {
    throw new Error('Missing environment variables')
  }

  // Initialize the Database-like Resolver
  const db = new AzeroIdResolver(parseInt(OG_TTL), AZERO_RPC_URL, SUPPORTED_TLDS)

  // Initialize the CCIP-Read Handler
  const signer = new ethers.utils.SigningKey(OG_PRIVATE_KEY)
  const gateway = makeServer(signer, db)

  // Initialize the Relayer
  const evmRpcUrl = `${EVM_RPC_BASE_URL}/${INFURA_API_KEY}`
  const wasmSigner = new Keyring().createFromUri(WASM_PRIVATE_KEY)
  const relayer = new AzeroIdRelayer(
    AZERO_RPC_URL,
    evmRpcUrl,
    EVM_RELAYER_CONTRACT,
    WASM_RELAYER_CONTRACT,
    wasmSigner,
    EVM_RELAYER_PRIVATE_KEY,
    BUFFER_DURATION_IN_MIN
  )

  // Setup itty-router (used by `@ensdomains/ccip-read-cf-worker`)
  const router = AutoRouter()
    .get('/', () => new Response('AZERO.ID Gateway & Relayer are running… 🌉', { status: 200 }))
    // Gateway
    .get(`/:sender/:callData.json`, gateway.handleRequest.bind(gateway))
    .post('/', gateway.handleRequest.bind(gateway))
    // Relayer
    .post(`/relay`, relayer.handleRequest.bind(relayer))

  const { address } = privateKeyToAccount(OG_PRIVATE_KEY)
  console.log(`Initialized Gateway & Relayer with Signing Address ${address}`)

  return router
}

export default {
  fetch(request: Request, env: any) {
    try {
      router = router || initRouter(env)
      return router.fetch(request)
    } catch (e) {
      console.error(e)
      return new Response('Internal server error', { status: 500 })
    }
  },
}
