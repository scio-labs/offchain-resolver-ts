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
import { registrationProxyAbi } from '../wagmi.generated'
import nodeMetadata from './metadata/aleph-node.json'

class AzeroIdRelayer {
  private azeroRpcUrl: string
  private evmRpcUrl: string
  private evmChain: Chain
  private evmRelayerAddress: `0x${string}`
  private bufferDuration: number
  private _azeroClient: LegacyClient | undefined
  private _evmClient: PublicClient | undefined

  constructor(
    azeroRpcUrl: string,
    evmRpcUrl: string,
    evmRelayerAddress: `0x${string}`,
    bufferDurationInMinutes: number
  ) {
    this.azeroRpcUrl = azeroRpcUrl
    this.evmRpcUrl = evmRpcUrl
    this.evmChain = evmRpcUrl.includes('mainnet') ? mainnet : sepolia
    if (!evmRpcUrl.includes('mainnet') && !evmRpcUrl.includes('sepolia')) {
      throw new Error('Invalid EVM RPC URL')
    }
    this.evmRelayerAddress = evmRelayerAddress
    this.bufferDuration = bufferDurationInMinutes * 60 * 1000; // converted to milliseconds
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

    // Parse the events from the transaction receipt
    const logs = parseEventLogs({
      logs: receipt.logs,
      abi: registrationProxyAbi,
      eventName: 'InitiateRequest'
    })

    logs.forEach((log) => {
      if (log.address !== this.evmRelayerAddress) return
      const { id, name, recipient, yearsToRegister, value, ttl } = log.args

      this.processRegistrationRequest(
        Number(id),
        name,
        recipient,
        yearsToRegister,
        Number(value),
        Number(ttl)
      )
    })

    return new Response('Not Implemented', { status: 501 })
  }

  private async processRegistrationRequest(
    id: number,
    name: string,
    recipient: string,
    yearsToRegister: number,
    value: number,
    ttl: number
  ) {
    console.log('New request:', id, name);

    if (this.isTTLValid(ttl)) {
      this.relayRequestToWasm(
        Number(id),
        name,
        recipient,
        Number(yearsToRegister),
        value
      );
    } else {
      // Ignore the request
      console.log(
        `Request ${Number(id)} skipped as its expiry-time falls short`
      );
    }
  }

  private async relayRequestToWasm(
    id: number,
    name: string,
    recipient: string,
    yearsToRegister: number,
    maxFeesInEVM: number
  ) { }

  /// @dev ttl is expected to be in seconds
  isTTLValid(ttl: number) {
    ttl = ttl * 1000; // convert seconds to milliseconds
    const currentTimestamp = Date.now();
    return currentTimestamp + this.bufferDuration <= ttl;
  }
}

export { AzeroIdRelayer }
