import { LegacyClient, WsProvider } from 'dedot'
import { AccountId32 } from 'dedot/codecs'
import { Contract, type ContractMetadata } from 'dedot/contracts'
import { createPublicClient, http } from 'viem'
import { mainnet, sepolia } from 'viem/chains'
import { normalize } from 'viem/ens'
import yoctoSpinner from 'yocto-spinner'
import contractMetadata from './metadata/azns-registry.json'
import type { AznsRegistryContractApi } from './types/azns-registry'

const spinner = yoctoSpinner()

/**
 * 0. Parse & validate args
 */
const regex = /^[a-zA-Z0-9-]+\.(azero|tzero)$/
if (!regex.test(Bun.argv[2] || '')) {
  console.error(`Passed domain (${Bun.argv[2]}) must be a valid .azero or .tzero domain!`)
  process.exit(1)
}

const domain = Bun.argv[2] as string
const isMainnet = domain.endsWith('.azero')

/**
 * 1. Fetch via EVM (Gateway)
 */
spinner.start('Fetching assigned ENS Resolver…')
const evmChain = isMainnet ? mainnet : sepolia
const transport = process.env.INFURA_API_KEY
  ? http(
      isMainnet
        ? `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
        : `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
    )
  : http()
const viemClient = createPublicClient({ chain: evmChain, transport })

const evmChainName = isMainnet ? 'Ethereum Mainnet' : 'Ethereum Sepolia'
const ensDomain = isMainnet ? `${domain}-id.eth` : `${domain}-id.eth`

const resolver = await viemClient.getEnsResolver({
  name: normalize(ensDomain),
})
spinner.info(`[${evmChainName}] Found Resolver: ${resolver}`).start()

const gatewayUrl = isMainnet
  ? `https://azero-id-gateway.nameverse.io`
  : `https://tzero-id-gateway.nameverse.io`
spinner.info(`[${evmChainName}] Gateway URL: ${gatewayUrl}`)

spinner.start(`Fetching ENS Address on EVM via Gateway (${gatewayUrl})…`)
const evmAddress = await viemClient.getEnsAddress({
  name: normalize(ensDomain),
  coinType: 643,
})

const evmAddressSs58 = evmAddress ? new AccountId32(evmAddress).address() : null
if (evmAddress && evmAddressSs58) {
  spinner.success(
    `[${evmChainName}] Resolved address of ${ensDomain}: ${evmAddressSs58} (${evmAddress})`,
  )
} else {
  spinner.error(`[${evmChainName}] Couldn't resolve address of ${ensDomain}`)
}

/**
 * 2. Fetch via AZERO
 */
spinner.start('Fetching address via AZERO…')
const provider = new WsProvider(isMainnet ? 'wss://ws.azero.dev' : 'wss://ws.test.azero.dev')
const dedotClient = await LegacyClient.new(provider)

const contractAddress = isMainnet
  ? '5CTQBfBC9SfdrCDBJdfLiyW2pg9z5W6C6Es8sK313BLnFgDf'
  : '5FsB91tXSEuMj6akzdPczAtmBaVKToqHmtAwSUzXh49AYzaD'
const defaultCaller = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' // Alice
const contract = new Contract<AznsRegistryContractApi>(
  dedotClient,
  contractMetadata as ContractMetadata,
  contractAddress,
  {
    defaultCaller,
  },
)

const azeroChainName = isMainnet ? 'Aleph Zero Mainnet' : 'Aleph Zero Testnet'
const domainName = domain.split('.')[0]

const { data: azeroResponse } = await contract.query.getAddress(domainName, {})
const azeroAddress = azeroResponse.isOk ? azeroResponse.value.address() : null
if (azeroResponse.isOk && azeroAddress) {
  spinner.success(
    `[${azeroChainName}] Resolved address of ${domain}: ${azeroAddress}`,
  )
} else {
  const error = azeroResponse.isErr ? azeroResponse.err.type : 'Unknown error'
  spinner.error(
    `[${azeroChainName}] Couldn't resolve address of ${domain}: ${error}`,
  )
}

/**
 * 3. Compare results
 */
spinner.start('Comparing results…')
if (evmAddressSs58 !== azeroAddress) {
  spinner.error('Resolved addresses mismatch!')
} else if (evmAddress !== azeroAddress) {
  spinner.success('Resolved addresses match!')
} else {
  spinner.stop()
}

process.exit(0)
