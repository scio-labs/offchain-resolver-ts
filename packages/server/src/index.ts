import { Keyring } from '@polkadot/keyring'
import { AutoRouter, cors, error } from 'itty-router'
import { privateKeyToAccount } from 'viem/accounts'
import { AzeroIdRelayer } from './azero-id-relayer'
import { AzeroIdResolver } from './azero-id-resolver'
import { makeServer } from './server'
import cachify from './utils/cahify'
import Logger from './utils/logger'

const log = Logger.getInstance()

function initRouter(env: any) {
  log.debug('Initializing Router…')

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

  // Initialize the Resolver & Gateway
  const resolver = new AzeroIdResolver(OG_TTL, AZERO_RPC_URL, SUPPORTED_TLDS)
  const gateway = makeServer(OG_PRIVATE_KEY, resolver)

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
    BUFFER_DURATION_IN_MIN,
  )

  // Setup itty-router (used by `@ensdomains/ccip-read-cf-worker`)
  const { preflight, corsify } = cors()
  const router = AutoRouter({
    before: [preflight],
    finally: [corsify, cachify(OG_TTL)],
  })
    .get('/', () => new Response('AZERO.ID Gateway is running… 🌉', { status: 200 }))
    // Gateway
    .get(`/:sender/:callData.json`, gateway.handleRequest.bind(gateway))
    .post('/', gateway.handleRequest.bind(gateway))
    // Relayer
    .post(`/relay`, relayer.handleRequest.bind(relayer))

  const { address } = privateKeyToAccount(OG_PRIVATE_KEY)
  const evmRelayerSigner = privateKeyToAccount(EVM_RELAYER_PRIVATE_KEY)
  log.info(`Initialized Gateway & Relayer with signer '${address}'`)
  log.info(`Initialized EVM relayer with Signing Address '${evmRelayerSigner.address}'`)
  log.info(`Initialized Substrate relayer with Signing Address '${wasmSigner.address}'`)

  return router
}

export default {
  fetch(request: Request, env: any) {
    log.setLogLevel(env.LOGLEVEL || 1)
    const router = initRouter(env)
    return router.fetch(request).catch(error)
  },
}
