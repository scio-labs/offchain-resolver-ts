import type { HexString } from '@dedot/utils'
import { LegacyClient, type MetadataKey, WsProvider } from 'dedot'
import {
  type Chain,
  createPublicClient,
  http,
  parseEventLogs,
  PublicClient,
  WaitForTransactionReceiptReturnType,
} from 'viem'
import { mainnet, sepolia } from 'viem/chains'
import { offchainResolverAbi } from '../wagmi.generated'
import nodeMetadata from './metadata/aleph-node.json'

class AzeroIdRelayer {
  private azeroRpcUrl: string
  private evmRpcUrl: string
  private evmChain: Chain
  private _azeroClient: LegacyClient | undefined
  private _evmClient: PublicClient | undefined

  constructor(azeroRpcUrl: string, evmRpcUrl: string) {
    this.azeroRpcUrl = azeroRpcUrl
    this.evmRpcUrl = evmRpcUrl
    this.evmChain = evmRpcUrl.includes('mainnet') ? mainnet : sepolia
    if (!evmRpcUrl.includes('mainnet') && !evmRpcUrl.includes('sepolia')) {
      throw new Error('Invalid EVM RPC URL')
    }
  }

  private async getAzeroClient() {
    if (!this._azeroClient) {
      const provider = new WsProvider(this.azeroRpcUrl)
      this._azeroClient = await LegacyClient.new({
        provider,
        cacheMetadata: false,
        metadata: nodeMetadata as Record<MetadataKey, HexString>,
      })
    }
    return this._azeroClient
  }

  private getEvmClient() {
    if (!this._evmClient) {
      const transport = http(this.evmRpcUrl)
      this._evmClient = createPublicClient({ chain: this.evmChain, transport })
    }
    return this._evmClient
  }

  async handleRequest(request: Request): Promise<Response> {
    const azeroClient = await this.getAzeroClient()
    const evmClient = this.getEvmClient()

    const { txHash } = await request.json()
    if (!txHash) return new Response('Bad Request', { status: 400 })

    // Wait for the transaction receipt
    let receipt: WaitForTransactionReceiptReturnType | undefined
    try {
      receipt = await evmClient.waitForTransactionReceipt({
        hash: txHash,
        retryCount: 3,
        retryDelay: 1000,
      })
    } catch (error) {
      console.error('Error waiting for transaction receipt:', error)
      return new Response('Transaction not found', { status: 404 })
    }

    console.log('Transaction Receipt:', receipt)
    // Transaction Receipt: Object {
    //   blockHash: 0x49907d495a6c35597a816a4d6b050794742645ca8acc4d19a3643884a2b92ab3,
    //   blockNumber: 6855444n,
    //   contractAddress: 0x5cf63c14b82c6e1b95023d8d23e682d12761f56c,
    //   cumulativeGasUsed: 10954755n,
    //   effectiveGasPrice: 22625898128n
    //   ...
    // }

    // Parse the events from the transaction receipt
    const logs = parseEventLogs({
      logs: receipt.logs,
      abi: offchainResolverAbi,
    })

    console.log('Event Logs:', logs[0], logs[1])
    // Event Logs: Object {
    //   eventName: OwnershipTransferred,
    //   args: Object,
    //   address: 0x5cf63c14b82c6e1b95023d8d23e682d12761f56c,
    //   blockHash: 0x49907d495a6c35597a816a4d6b050794742645ca8acc4d19a3643884a2b92ab3,
    //   blockNumber: 6855444n
    //   ...
    // } Object {
    //   eventName: NewSigners,
    //   args: Object,
    //   address: 0x5cf63c14b82c6e1b95023d8d23e682d12761f56c,
    //   blockHash: 0x49907d495a6c35597a816a4d6b050794742645ca8acc4d19a3643884a2b92ab3,
    //   blockNumber: 6855444n
    //   ...
    // }

    // TODO @Nimish

    // Execute something on Aleph Zero
    // IMPORTANT: Create contract types via https://docs.dedot.dev/ink-smart-contracts/generate-types-and-apis (like `../types/azns-registry/`)
    // const contract = new Contract({client: azeroClient, address: '…'})
    // const x = await contract.tx.

    return new Response('Not Implemented', { status: 501 })
  }
}

export { AzeroIdRelayer }
