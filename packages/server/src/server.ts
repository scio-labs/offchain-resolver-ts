import { Server } from '@ensdomains/ccip-read-cf-worker'
import { abi as IResolverService_abi } from '@ensdomains/offchain-resolver-contracts/artifacts/contracts/OffchainResolver.sol/IResolverService.json'
import { Result } from 'ethers/lib/utils'
import {
  AbiFunction,
  concat,
  decodeAbiParameters,
  encodeAbiParameters,
  encodePacked,
  Hex,
  keccak256,
  namehash,
  parseAbiItem,
  toFunctionHash,
  toHex,
} from 'viem'
import { sign } from 'viem/accounts'
import { normalize } from 'viem/ens'

const ETH_COIN_TYPE = 60

interface DatabaseResult {
  result: any[]
  ttl: number
}

export interface Database {
  addr(name: string, coinType: number): Promise<{ addr: string; ttl: number }>
  text(name: string, key: string): Promise<{ value: string; ttl: number }>
  contenthash(name: string): Promise<{ contenthash: string; ttl: number }>
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
  [key: string]: (db: Database, name: string, args: unknown[]) => Promise<DatabaseResult>
} = {
  'function addr(bytes32 node) returns (address)': async (db, name, _) => {
    const { addr, ttl } = await db.addr(name, ETH_COIN_TYPE)
    return { result: [addr], ttl }
  },
  'function addr(bytes32,uint256) returns (bytes)': async (db, name, args) => {
    const { addr, ttl } = await db.addr(name, args[0] as number)
    return { result: [addr], ttl }
  },
  'function text(bytes32,string) returns (string)': async (db, name, args) => {
    const { value, ttl } = await db.text(name, args[0] as string)
    return { result: [value], ttl }
  },
  'function contenthash(bytes32) returns (bytes)': async (db, name, _args) => {
    const { contenthash, ttl } = await db.contenthash(name)
    return { result: [contenthash], ttl }
  },
}

const querySelectors = Object.keys(queryHandlers).map((fn) =>
  toFunctionHash(fn).slice(0, 10).toLowerCase(),
)

async function query(
  db: Database,
  name: string,
  callData: Hex,
): Promise<{ result: Hex; validUntil: number }> {
  // Determine handler
  const selector = callData.slice(0, 10).toLowerCase()
  const selectorIndex = querySelectors.indexOf(selector)
  if (selectorIndex === -1) {
    throw new Error(`Unsupported query selector ${selector}`)
  }

  // Parse function arguments
  const signature = Object.keys(queryHandlers)[selectorIndex]
  const functionAbi = parseAbiItem(signature) as AbiFunction
  const args = decodeAbiParameters(functionAbi.inputs, `0x${callData.slice(10)}`)

  // Sanity check domain
  if (normalize(name) !== name) {
    throw new Error('Name must be normalised')
  }
  if (namehash(name) !== args[0]) {
    throw new Error('Name does not match namehash')
  }

  // Execute handler and encode result
  const handler = queryHandlers[signature]
  const { result, ttl } = await handler(db, name, args.slice(1))
  const encodedResult = encodeAbiParameters(functionAbi.outputs, result)

  return {
    result: encodedResult,
    validUntil: Math.floor(Date.now() / 1000 + ttl),
  }
}

export function makeServer(privateKey: Hex, db: Database) {
  const server = new Server()
  server.add(IResolverService_abi, [
    {
      type: 'resolve',
      func: async ([encodedName, data]: Result, request) => {
        const encodedNameBuffer = Buffer.from(encodedName.slice(2), 'hex')
        const name = decodeDnsName(encodedNameBuffer)

        // Query the database (i.e. our Azero ID resolver)
        const { result, validUntil } = await query(db, name, data)

        // Hash and sign the response
        const messageHash = keccak256(
          encodePacked(
            ['bytes', 'address', 'uint64', 'bytes32', 'bytes32'],
            [
              '0x1900',
              request?.to as Hex,
              BigInt(validUntil),
              keccak256((request?.data as Hex) || '0x'),
              keccak256(result as Hex),
            ],
          ),
        )

        const sig = await sign({ hash: messageHash, privateKey })
        const sigData = concat([sig.r, sig.s, toHex(sig.v!)])

        return [result, validUntil, sigData]
      },
    },
  ])
  return server
}
