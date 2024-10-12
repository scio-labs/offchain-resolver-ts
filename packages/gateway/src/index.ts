import { ethers } from 'ethers'
import { AutoRouter, AutoRouterType } from 'itty-router'
import { privateKeyToAccount } from 'viem/accounts'
import { AzeroIdResolver } from './azero-id-resolver'
import { makeServer } from './server'

let router: AutoRouterType | undefined
function initRouter(env: any) {
  console.log('Initializing…')

  // Destructure environment variables
  const { OG_PRIVATE_KEY, SUPPORTED_TLDS, OG_TTL, AZERO_RPC_URL } = env
  if (!Object.keys(SUPPORTED_TLDS || {}).length || !OG_PRIVATE_KEY || !OG_TTL || !AZERO_RPC_URL) {
    throw new Error('Missing environment variables')
  }

  // Initialize the Database-like Resolver
  const db = new AzeroIdResolver(parseInt(OG_TTL), AZERO_RPC_URL, SUPPORTED_TLDS)

  // Initialize the CCIP-Read Handler
  const signer = new ethers.utils.SigningKey(OG_PRIVATE_KEY)
  const gateway = makeServer(signer, db)

  // Setup itty-router (used by `@ensdomains/ccip-read-cf-worker`)
  const router = AutoRouter()
    .get('/', () => new Response('AZERO.ID Gateway is running… 🌉', { status: 200 }))
    .get(`/:sender/:callData.json`, gateway.handleRequest.bind(gateway))
    .post('/', gateway.handleRequest.bind(gateway))

  const { address } = privateKeyToAccount(OG_PRIVATE_KEY)
  console.log(`Initialized with signing address ${address}`)

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
