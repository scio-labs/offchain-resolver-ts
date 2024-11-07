import { getCoderByCoinType } from '@ensdomains/address-encoder'
import { createDotAddressDecoder } from '@ensdomains/address-encoder/utils'
import { LegacyClient, WsProvider } from 'dedot'
import { Contract, ContractMetadata } from 'dedot/contracts'
import { toHex, zeroAddress } from 'viem'
import { AznsRegistryContractApi } from '../types/azns-registry'
import { makeDedotFakeClient } from './dedot-fake-client'
import contractMetadata from './metadata/azns-registry.json'
import { Database } from './server'
import Logger from './utils/logger'

const log = Logger.getInstance()

const AZERO_COIN_TYPE = 643
const ALICE_SS58 = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'

export class AzeroIdResolver implements Database {
  private provider: WsProvider | undefined
  private client: LegacyClient | undefined
  private contractForAddress = new Map<string, Contract<AznsRegistryContractApi>>()

  constructor(
    private ttl: number,
    private azeroRpcUrl: string,
    private tldToContractAddress: Record<string, string>,
  ) {}

  private async getContract(tld: string) {
    if (!this.tldToContractAddress[tld]) return null
    const contractAddress = this.tldToContractAddress[tld]

    if (this.contractForAddress.has(contractAddress))
      return this.contractForAddress.get(contractAddress)

    // Initialize Substrate API
    // if (!this.azeroClient) {
    //   log.debug(`[Resolver] Initializing Client for '${this.azeroRpcUrl}'`)
    //   const provider = new WsProvider(this.azeroRpcUrl)
    //   this.azeroClient = await LegacyClient.new({
    //     provider,
    //     cacheMetadata: true,
    //     cacheStorage: new KVCacheStorage(this.kv),
    //   })
    // } else if (this.azeroClient.status !== 'connected') {
    //   await this.azeroClient.connect()
    // }

    // Initialize optimized RPC client
    if (!this.client || !this.provider) {
      log.debug(`[Resolver] Initializing Fake Client for '${this.azeroRpcUrl}'`)
      this.provider = new WsProvider(this.azeroRpcUrl)
      this.client = await makeDedotFakeClient(this.provider)
    }

    if (this.provider.status !== 'connected') {
      await this.provider.connect()
    }

    // Initialize Contract Instance
    log.debug(`[Resolver] Initializing Contract Instance for '${contractAddress}'`)
    const contract = new Contract<AznsRegistryContractApi>(
      this.client,
      contractMetadata as ContractMetadata,
      contractAddress,
      { defaultCaller: ALICE_SS58 },
    )
    this.contractForAddress.set(contractAddress, contract)

    return contract
  }

  async addr(name: string, coinType: number) {
    log.debug("[Resolver] Called 'addr':", name, coinType)
    coinType = Number(coinType)

    let value
    if (coinType == AZERO_COIN_TYPE) {
      value = await this.fetchA0ResolverAddress(name)
    } else {
      let alias = AzeroIdResolver.getAlias('' + coinType)
      if (alias !== undefined) {
        const serviceKey = 'address.' + alias
        value = await this.fetchRecord(name, serviceKey)
      }
      if (value === undefined) {
        const serviceKey = 'address.' + coinType
        value = await this.fetchRecord(name, serviceKey)
      }
    }

    if (value === undefined) {
      value = coinType == 60 ? zeroAddress : '0x'
    } else {
      value = AzeroIdResolver.encodeAddress(value, coinType)
    }

    log.debug("[Resolver] Returning 'addr':", value)
    return { addr: value, ttl: this.ttl }
  }

  async text(domain: string, key: string) {
    log.debug("[Resolver] Called 'text':", domain, key)

    let value = ''

    // Static root domain values
    const isRootDomain = Object.keys(this.tldToContractAddress).includes(domain)
    if (isRootDomain) {
      if (key === 'avatar') {
        value = 'https://azero.id/og/logo.png'
      } else if (key === 'description') {
        value = `This is an official AZERO.ID root domain. Resolve your domain on ENS like "<name>.${domain}". Powered by our Aleph Zero CCIP-Read Gateway Service.`
      } else if (key === 'url') {
        value = `https://azero.id`
      } else if (key === 'com.twitter') {
        value = `@azero_id`
      }
    } else {
      value = (await this.fetchRecord(domain, key)) || ''
    }

    log.debug("[Resolver] Returning 'text':", value)
    return { value, ttl: this.ttl }
  }

  async contenthash(domain: string) {
    log.debug("[Resolver] Called 'contenthash' (NOT SUPPORTED):", domain)

    return { contenthash: '0x', ttl: this.ttl }
  }

  private async fetchRecord(domain: string, key: string) {
    let { name, contract } = await this.processName(domain)

    const { data } = await contract.query.getRecord(name, key, {})

    if (data.isErr && data.err.type === 'RecordNotFound') {
      // Return certain fallback values
      if (key === 'avatar') return 'https://azero.id/og/logo.png'
      if (key === 'description')
        return 'This domain is registered at AZERO.ID and resolves through ENS. Powered by our Aleph Zero CCIP-Read Gateway Service.'

      return undefined
    }
    if (!data.isOk) {
      log.error(`[Resolver] Failed to fetch record with key '${key}' for '${domain}': ${data.err}`)
      throw new Error(`Failed to fetch record: ${data.err}`)
    }

    log.debug(`[Resolver] Fetched record with key '${key}' for '${domain}':`, data.value)
    return data.value
  }

  private async fetchA0ResolverAddress(domain: string) {
    let { name, contract } = await this.processName(domain)

    const { data } = await contract.query.getAddress(name, {})
    if (!data.isOk) {
      log.error(`[Resolver] Failed to fetch Aleph Zero address for '${domain}': ${data.err}`)
      throw new Error(`Failed to fetch resolver address: ${data.err}`)
    }
    const address = data.value.address()

    log.debug(`[Resolver] Fetched Aleph Zero address for '${domain}':`, address)
    return address
  }

  private async processName(domain: string) {
    const labels = domain.split('.')
    const name = labels.shift() || ''
    let tld = labels.join('.')

    // Assign TLD to root domains
    const isRootDomain = Object.keys(this.tldToContractAddress).includes(domain)
    if (isRootDomain) {
      tld = domain
    }

    const contract = await this.getContract(tld)
    if (!contract) {
      log.warn(`[Resolver] Requested TLD '.${tld}' is not supported`)
      throw new Error(`Requested TLD '.${tld}' is not supported`)
    }

    return { name, contract }
  }

  static getAlias(coinType: string) {
    // TODO @Dennis Consider switching to an 'address.<coinType>' format
    const alias = new Map<string, string>([
      ['0', 'btc'],
      ['60', 'eth'],
      ['354', 'dot'],
      ['434', 'ksm'],
      ['501', 'sol'],
    ])

    return alias.get(coinType)
  }

  static encodeAddress(addr: string, coinType: number) {
    const isEvmCoinType = (c: number) => {
      return c == 60 || (c & 0x80000000) != 0
    }

    if (coinType == AZERO_COIN_TYPE) {
      const azeroCoder = createDotAddressDecoder(42)
      return toHex(azeroCoder(addr))
    }
    if (isEvmCoinType(coinType) && !addr.startsWith('0x')) {
      addr = '0x' + addr
    }

    try {
      const coder = getCoderByCoinType(coinType)
      return toHex(coder.decode(addr))
    } catch {
      return addr
    }
  }
}
