import { Server } from '@ensdomains/ccip-read-cf-worker'
import { abi as Resolver_abi } from '@ensdomains/ens-contracts/artifacts/contracts/resolvers/Resolver.sol/Resolver.json'
import { abi as IResolverService_abi } from '@ensdomains/offchain-resolver-contracts/artifacts/contracts/OffchainResolver.sol/IResolverService.json'
import { BytesLike, ethers } from 'ethers'
import { hexConcat, Result } from 'ethers/lib/utils'
import { AutoRouter } from 'itty-router'

const ETH_COIN_TYPE = 60

const Resolver = new ethers.utils.Interface(Resolver_abi)

interface DatabaseResult {
  result: any[]
  ttl: number
}

type PromiseOrResult<T> = T | Promise<T>

export interface Database {
  addr(name: string, coinType: number): PromiseOrResult<{ addr: string; ttl: number }>
  text(name: string, key: string): PromiseOrResult<{ value: string; ttl: number }>
  contenthash(name: string): PromiseOrResult<{ contenthash: string; ttl: number }>
}

function decodeDnsName(dnsname: Buffer) {
  const labels = []
  let idx = 0
  while (true) {
    const len = dnsname.readUInt8(idx)
    if (len === 0) break
    labels.push(dnsname.slice(idx + 1, idx + len + 1).toString('utf8'))
    idx += len + 1
  }
  return labels.join('.')
}

const queryHandlers: {
  [key: string]: (db: Database, name: string, args: Result) => Promise<DatabaseResult>
} = {
  'addr(bytes32)': async (db, name, _args) => {
    console.log('handle: addr')
    const { addr, ttl } = await db.addr(name, ETH_COIN_TYPE)
    return { result: [addr], ttl }
  },
  'addr(bytes32,uint256)': async (db, name, args) => {
    console.log('handle: addr')
    const { addr, ttl } = await db.addr(name, args[0])
    return { result: [addr], ttl }
  },
  'text(bytes32,string)': async (db, name, args) => {
    console.log('handle: text')
    const { value, ttl } = await db.text(name, args[0])
    return { result: [value], ttl }
  },
  'contenthash(bytes32)': async (db, name, _args) => {
    console.log('handle: contenthash')
    const { contenthash, ttl } = await db.contenthash(name)
    return { result: [contenthash], ttl }
  },
}

async function query(
  db: Database,
  name: string,
  data: string,
): Promise<{ result: BytesLike; validUntil: number }> {
  console.log('[server] query 1')
  // Parse the data nested inside the second argument to `resolve`
  const { signature, args } = Resolver.parseTransaction({ data })

  console.log('[server] query 2')

  if (ethers.utils.nameprep(name) !== name) {
    throw new Error('Name must be normalised')
  }

  console.log('[server] query 3')

  if (ethers.utils.namehash(name) !== args[0]) {
    throw new Error('Name does not match namehash')
  }

  console.log('[server] query 4')

  const handler = queryHandlers[signature]
  if (handler === undefined) {
    throw new Error(`Unsupported query function ${signature}`)
  }

  console.log('[server] query 5')

  const { result, ttl } = await handler(db, name, args.slice(1))
  return {
    result: Resolver.encodeFunctionResult(signature, result),
    validUntil: Math.floor(Date.now() / 1000 + ttl),
  }
}

export function makeServer(signer: ethers.utils.SigningKey, db: Database) {
  const server = new Server()
  server.add(IResolverService_abi, [
    {
      type: 'resolve',
      func: async ([encodedName, data]: Result, request) => {
        console.log("resolve 1")
        const name = decodeDnsName(Buffer.from(encodedName.slice(2), 'hex'))
        // Query the database
        console.log("resolve 2")
        const { result, validUntil } = await query(db, name, data)
        console.log("resolve 3")
        
        // Hash and sign the response
        let messageHash = ethers.utils.solidityKeccak256(
          ['bytes', 'address', 'uint64', 'bytes32', 'bytes32'],
          [
            '0x1900',
            request?.to,
            validUntil,
            ethers.utils.keccak256(request?.data || '0x'),
            ethers.utils.keccak256(result),
          ],
        )
        const sig = signer.signDigest(messageHash)
        const sigData = hexConcat([sig.r, sig.s, ethers.utils.hexlify(sig.v)])
        console.log("resolve 4")
        return [result, validUntil, sigData]
      },
    },
  ])
  return server
}

export function makeApp(signer: ethers.utils.SigningKey, path: string, db: Database) {
  const server = makeServer(signer, db)
  const router = AutoRouter()

  return router
    .get(path, () => new Response('AZERO.ID Gateway is running… 🌉', { status: 200 }))
    .get(`${path}:sender/:callData.json`, server.handleRequest.bind(server))
    .post(path, server.handleRequest.bind(server))
}
