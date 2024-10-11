import { getCoderByCoinType } from '@ensdomains/address-encoder'
import { createDotAddressDecoder } from '@ensdomains/address-encoder/utils'
import { LegacyClient, WsProvider } from 'dedot'
import { Contract, ContractMetadata } from 'dedot/contracts'
import { toHex } from 'viem'
import { AznsRegistryContractApi } from '../types/azns-registry'
import contractMetadata from './metadata/azns-registry.json'
import { Database } from './server'

const AZERO_COIN_TYPE = 643
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const EMPTY_CONTENT_HASH = '0x'

export class AzeroIdResolver implements Database {
  ttl: number
  tldToContractAddress: Record<string, string>
  azeroRpcUrl: string
  azeroClient: LegacyClient | undefined
  _tldToContract = new Map<string, Contract<AznsRegistryContractApi>>()

  constructor(ttl: number, azeroRpcUrl: string, tldToContractAddress: Record<string, string>) {
    this.ttl = ttl
    this.azeroRpcUrl = azeroRpcUrl
    this.tldToContractAddress = tldToContractAddress
  }

  async getContract(tld: string) {
    if (!this.tldToContractAddress[tld]) return null
    if (this._tldToContract.has(tld)) return this._tldToContract.get(tld)!

    // Initialize Substrate API
    if (!this.azeroClient) {
      console.log('nere')
      // TODO @Dennis Efficiently preload chain metadata
      // const metadata = nodeMetadata as Record<MetadataKey, HexString>
      const provider = new WsProvider(this.azeroRpcUrl)
      this.azeroClient = await LegacyClient.new({ provider, cacheMetadata: false })
    }

    // Initialize Contract Instance
    const defaultCaller = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' // Alice
    const contract = new Contract<AznsRegistryContractApi>(
      this.azeroClient,
      contractMetadata as ContractMetadata,
      this.tldToContractAddress[tld],
      { defaultCaller },
    )
    this._tldToContract.set(tld, contract)

    return contract
  }

  async addr(name: string, coinType: number) {
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
      value = coinType == 60 ? ZERO_ADDRESS : '0x'
    } else {
      value = AzeroIdResolver.encodeAddress(value, coinType)
    }

    return { addr: value, ttl: this.ttl }
  }

  async text(name: string, key: string) {
    const value = (await this.fetchRecord(name, key)) || ''
    return { value, ttl: this.ttl }
  }

  contenthash(name: string) {
    return { contenthash: EMPTY_CONTENT_HASH, ttl: this.ttl }
  }

  private async fetchRecord(domain: string, key: string) {
    let { name, contract } = await this.processName(domain)

    const { data } = await contract.query.getRecord(name, key, {})
    if (!data.isOk) {
      throw new Error(`Failed to fetch record: ${data.err}`)
    }

    return data.value
  }

  private async fetchA0ResolverAddress(domain: string) {
    let { name, contract } = await this.processName(domain)

    const { data } = await contract.query.getAddress(name, {})
    if (!data.isOk) {
      throw new Error(`Failed to fetch resolver address: ${data.err}`)
    }

    return data.value.address()
  }

  private async processName(domain: string) {
    const labels = domain.split('.')

    const name = labels.shift() || ''
    const tld = labels.join('.')

    const contract = await this.getContract(tld)
    if (!contract) {
      throw new Error(`TLD (.${tld}) not supported`)
    }

    return { name, contract }
  }

  static getAlias(coinType: string) {
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
