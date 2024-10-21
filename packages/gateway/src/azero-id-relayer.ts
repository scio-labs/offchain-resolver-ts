import { KeyringPair } from '@polkadot/keyring/types'
import { LegacyClient, WsProvider } from 'dedot'
import { Contract, ContractMetadata } from 'dedot/contracts'
import {
  type Chain,
  createPublicClient,
  createWalletClient,
  http,
  parseEventLogs,
  PublicClient,
  WaitForTransactionReceiptReturnType,
  WalletClient
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, sepolia } from 'viem/chains'
import { WasmContractApi } from '../types/wasm'
import { registrationProxyAbi } from '../wagmi.generated'
import wasmRelayerMetadata from './metadata/wasmRelayer.json'

class AzeroIdRelayer {
  private azeroRpcUrl: string
  private evmRpcUrl: string
  private evmChain: Chain
  private evmRelayerAddress: `0x${string}`
  private wasmRelayerAddress: string
  private wasmSigner: KeyringPair
  private evmSignerKey: `0x${string}`
  private bufferDuration: number
  private _azeroClient: LegacyClient | undefined
  private _evmClient: PublicClient | undefined
  private _evmWallet: WalletClient | undefined
  private _wasmRelayerContract: Contract<WasmContractApi> | undefined

  constructor(
    azeroRpcUrl: string,
    evmRpcUrl: string,
    evmRelayerAddress: `0x${string}`,
    wasmRelayerAddress: string,
    wasmSigner: KeyringPair,
    evmSignerKey: `0x${string}`,
    bufferDurationInMinutes: number
  ) {
    this.azeroRpcUrl = azeroRpcUrl
    this.evmRpcUrl = evmRpcUrl
    this.evmChain = evmRpcUrl.includes('mainnet') ? mainnet : sepolia
    if (!evmRpcUrl.includes('mainnet') && !evmRpcUrl.includes('sepolia')) {
      throw new Error('Invalid EVM RPC URL')
    }
    this.evmRelayerAddress = evmRelayerAddress
    this.wasmRelayerAddress = wasmRelayerAddress
    this.wasmSigner = wasmSigner
    this.evmSignerKey = evmSignerKey
    this.bufferDuration = bufferDurationInMinutes * 60 * 1000; // converted to milliseconds
  }

  private async getAzeroClient() {
    if (!this._azeroClient) {
      const provider = new WsProvider(this.azeroRpcUrl)
      this._azeroClient = await LegacyClient.new({
        provider,
        cacheMetadata: false,
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

  private getEvmWallet() {
    if (!this._evmWallet)
      this._evmWallet = createWalletClient({
        account: privateKeyToAccount(this.evmSignerKey),
        chain: this.evmChain,
        transport: http(this.evmRpcUrl),
      })

    return this._evmWallet
  }

  private async getWasmRelayerContract() {
    if (!this._wasmRelayerContract) {
      this._wasmRelayerContract = new Contract<WasmContractApi>(
        await this.getAzeroClient(),
        wasmRelayerMetadata as ContractMetadata,
        this.wasmRelayerAddress
      )
    }
    return this._wasmRelayerContract
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

    for (var log of logs) {
      if (log.address !== this.evmRelayerAddress.toLowerCase()) continue
      const { id, name, recipient, yearsToRegister, value, ttl } = log.args

      await this.processRegistrationRequest(
        id,
        name,
        recipient,
        yearsToRegister,
        value,
        ttl
      )
    }

    return new Response('Not Implemented', { status: 501 })
  }

  private async processRegistrationRequest(
    id: bigint,
    name: string,
    recipient: string,
    yearsToRegister: number,
    value: bigint,
    ttl: bigint
  ): Promise<void> {
    console.log('New request:', id, name);

    if (this.isTTLValid(Number(ttl))) {
      await this.relayRequestToWasm(
        id,
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
    id: bigint,
    name: string,
    recipient: string,
    yearsToRegister: number,
    maxFeesInEVM: bigint
  ): Promise<void> {
    const wasmRelayerContract = await this.getWasmRelayerContract()
    const maxFeesInWASM = this.valueEVM2WASM(maxFeesInEVM)

    // first dry-run to save Tx that would fail
    const { data, raw } = await wasmRelayerContract.query.register(
      id,
      name,
      recipient,
      yearsToRegister,
      maxFeesInWASM,
      {
        caller: this.wasmSigner.address
      }
    )

    if (data.isErr) {
      console.log('Cannot make transaction due to error:', data.err);
      // relay failure status back to EVM
      return this.failure(id)
    }

    await wasmRelayerContract.tx.register(
      id,
      name,
      recipient,
      yearsToRegister,
      maxFeesInWASM,
      {
        gasLimit: raw.gasRequired
      }
    ).signAndSend(this.wasmSigner, ({ status, events }) => {
      if (status.type === 'Finalized') {
        const successEvent = wasmRelayerContract.events.Success.find(events)

        if (successEvent === undefined) {
          // Failure
          console.log('Failed to register');
          this.failure(id);
        } else {
          // Success
          const priceInWASM = successEvent.data.price;
          console.log('Registered successfully with price:', Number(priceInWASM));
          const refundInEVM = maxFeesInEVM - this.valueWASM2EVM(priceInWASM);
          this.success(id, refundInEVM);
        }
      }
    })
  }

  private async success(id: bigint, refundInEVM: bigint) { }

  private async failure(id: bigint) { }

  private valueEVM2WASM(valueInEVM: bigint): bigint {
    // TODO: set value converter properly
    return valueInEVM + BigInt(10000000000000)
  }

  private valueWASM2EVM(valueInEVM: bigint): bigint {
    // TODO: set value converter properly
    return BigInt(0)
  }

  /// @dev ttl is expected to be in seconds
  isTTLValid(ttl: number) {
    ttl = ttl * 1000; // convert seconds to milliseconds
    const currentTimestamp = Date.now();
    return currentTimestamp + this.bufferDuration <= ttl;
  }
}

export { AzeroIdRelayer }
