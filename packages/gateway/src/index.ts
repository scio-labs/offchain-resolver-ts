import { ethers } from 'ethers'
import { privateKeyToAccount } from 'viem/accounts'
import { AzeroIdResolver } from './azero-id-resolver'
import { makeApp } from './server'

function initApp(env: any) {
  console.log('Initializing app…')

  // Destructure environment variables
  const { OG_PRIVATE_KEY, OG_TTL, WS_PROVIDER_URL, SUPPORTED_TLDS } = env
  if (!OG_PRIVATE_KEY || !OG_TTL || !WS_PROVIDER_URL || !Object.keys(SUPPORTED_TLDS || {}).length) {
    throw new Error('Missing environment variables')
  }

  // Initialize the Database-like Resolver
  const db = new AzeroIdResolver(parseInt(OG_TTL), WS_PROVIDER_URL, SUPPORTED_TLDS  )

  // Initialize the CCIP-Read Handler
  const signer = new ethers.utils.SigningKey(OG_PRIVATE_KEY)
  const app = makeApp(signer, '/', db)

  const { address } = privateKeyToAccount(OG_PRIVATE_KEY)
  console.log(`Initialized app with signing address ${address}`)

  return app
}

export default {
  async fetch(request: Request, env: any) {
    try {
      const app = initApp(env)
      return app.fetch(request)
    } catch (e) {
      console.error(e)
      return new Response('xInternal server error', { status: 500 })
    }
  },
}
