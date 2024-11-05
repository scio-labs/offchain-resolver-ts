import { KeyringPair } from '@polkadot/keyring/types'
import { LegacyClient, WsProvider } from 'dedot'
import { Contract, ContractMetadata } from 'dedot/contracts'
import {
  BaseError,
  type Chain,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  http,
  parseEventLogs,
  PublicClient,
  WaitForTransactionReceiptReturnType,
  WalletClient,
  zeroAddress
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, sepolia } from 'viem/chains'
import { WasmContractApi } from '../types/wasm'
import { registrationProxyAbi } from '../wagmi.generated'
import wasmRelayerMetadata from './metadata/wasmRelayer.json'

class AzeroIdRelayer {
  private isPaused: boolean
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
    this.isPaused = false
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

    const { txHash, reqId } = await request.json()
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
    }).filter(log => log.address === this.evmRelayerAddress.toLowerCase() &&
      (reqId === undefined) ? true : log.args.id == reqId)

    if (logs.length === 0) return new Response('No event found', { status: 404 })
    if (logs.length !== 1) return new Response(`Multiple events found; specify 'reqId'`, { status: 400 })

    const { id, name, recipient, yearsToRegister, metadata, paymentToken, value, ttl } = logs[0].args

    return this.processRegistrationRequest(
      id,
      name,
      recipient,
      yearsToRegister,
      metadata as unknown as Array<[string, string]>,
      paymentToken,
      value,
      ttl
    )
  }

  private async processRegistrationRequest(
    id: bigint,
    name: string,
    recipient: string,
    yearsToRegister: number,
    metadata: Array<[string, string]>,
    paymentToken: `0x${string}`,
    value: bigint,
    ttl: bigint
  ): Promise<Response> {
    console.log('New request:', id, name);

    if (this.isPaused) {
      console.log(`Request Id(${Number(id)}) skipped; Not accepting any new requests`)
      return new Response('Relayer is paused, Request skipped', { status: 503 })
    } else if (this.isTTLValid(Number(ttl))) {
      return this.relayRequestToWasm(
        id,
        name,
        recipient,
        Number(yearsToRegister),
        metadata,
        paymentToken,
        value
      );
    } else {
      // Ignore the request
      console.log(
        `Request ${Number(id)} skipped as its expiry-time falls short`
      );
      return new Response('TTL expired', { status: 500 })
    }
  }

  private async relayRequestToWasm(
    id: bigint,
    name: string,
    recipient: string,
    yearsToRegister: number,
    metadata: Array<[string, string]>,
    paymentToken: `0x${string}`,
    maxFeesInEVM: bigint
  ): Promise<Response> {
    const wasmRelayerContract = await this.getWasmRelayerContract()
    const maxFeesInWASM = this.valueEVM2WASM(maxFeesInEVM, paymentToken)

    // first dry-run to save Tx that would fail
    const { data, raw } = await wasmRelayerContract.query.register(
      id,
      name,
      recipient,
      yearsToRegister,
      metadata,
      maxFeesInWASM,
      {
        caller: this.wasmSigner.address
      }
    )

    if (data.isErr) {
      console.log('Cannot make transaction due to error:', data.err);
      // relay failure status back to EVM
      if (data.err.type === 'DuplicateId') return new Response('Duplicate request', { status: 500 })
      return this.failure(id)
    }

    let response: Promise<Response> | undefined

    await wasmRelayerContract.tx.register(
      id,
      name,
      recipient,
      yearsToRegister,
      metadata,
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
          response = this.failure(id);
        } else {
          // Success
          const priceInWASM = successEvent.data.price;
          console.log('Registered successfully with price:', Number(priceInWASM));
          try {
            const refundInEVM = maxFeesInEVM - this.valueWASM2EVM(priceInWASM, paymentToken);
            response = this.success(id, refundInEVM);
          } catch (error: any) {
            const errMsg = `ALERT: Success status could not be relayed back\nError log: ${error.message}`
            console.log(`(Request Id: ${id})`, errMsg)
            response = (async () => new Response(errMsg, { status: 500 }))()
          }
        }
      }
    })

    const waitForResponse = (): Promise<Response> => {
      return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          if (response !== undefined) {
            clearInterval(interval)
            response.then(resolve).catch(reject)
          }
        }, 1000)
      })
    }

    return waitForResponse()
  }

  private async success(id: bigint, refundInEVM: bigint): Promise<Response> {
    const evmClient = this.getEvmClient()
    const evmWallet = this.getEvmWallet()

    let receipt
    try {
      const hash = await evmWallet.writeContract({
        address: this.evmRelayerAddress,
        abi: registrationProxyAbi,
        functionName: 'success',
        args: [id, refundInEVM],
        account: privateKeyToAccount(this.evmSignerKey),
        chain: this.evmChain
      })
      receipt = await evmClient.waitForTransactionReceipt({ hash })
    } catch (err) {
      // ALERT: RELAYER FAILURE
      this.isPaused = true
      const errMsg = `ALERT: Success status could not be relayed back\nError log: ${err ?? ''}`
      console.log(`(Request Id: ${id})`, errMsg)
      return new Response(errMsg, { status: 500 })
    }

    const logs = parseEventLogs({
      logs: receipt.logs,
      abi: registrationProxyAbi,
      eventName: 'ResultInfo',
      args: {
        id,
        success: true
      }
    })

    const relaySuccess = logs.some((log) => {
      return log.address === this.evmRelayerAddress.toLowerCase()
    })

    if (relaySuccess) {
      console.log(`(Request Id: ${id}) Success status relayed back successfully`);
      return new Response('Success', { status: 200 })
    } else {
      // ALERT: RELAYER FAILURE
      this.isPaused = true
      const errMsg = `ALERT: success status could not be relayed back`
      console.log(`(Request Id: ${id})`, errMsg)
      return new Response(errMsg, { status: 500 })
    }
  }

  private async failure(id: bigint): Promise<Response> {
    const evmClient = this.getEvmClient()
    const evmWallet = this.getEvmWallet()

    const request = await this._mockFailure(id)
    if (request === undefined) return new Response(`Failure state couldn't be relayed back`, { status: 501 })
    const hash = await evmWallet.writeContract(request)
    const receipt = await evmClient.waitForTransactionReceipt({ hash })

    const logs = parseEventLogs({
      logs: receipt.logs,
      abi: registrationProxyAbi,
      eventName: 'ResultInfo',
      args: {
        id,
        success: false
      }
    })

    const relaySuccess = logs.some((log) => {
      return log.address === this.evmRelayerAddress.toLowerCase()
    })

    if (relaySuccess) {
      console.log(`(Request Id: ${id}) Failure status relayed back successfully`);
      return new Response('Failure status relayed back successfully', { status: 500 })
    } else {
      console.log(`(Request Id: ${id}) Failure status was NOT relayed back`);
      return new Response('Failure status was NOT relayed back', { status: 500 })
    }
  }

  // AZERO decimals on EVM: 18
  // AZERO decimals on WASM: 12
  private valueEVM2WASM(valueInEVM: bigint, fromPaymentToken: `0x${string}`): bigint {
    if (fromPaymentToken !== zeroAddress) throw new Error(`Token(${fromPaymentToken}) not supported`)
    return valueInEVM / BigInt(1_000_000)
  }

  private valueWASM2EVM(valueInWASM: bigint, toPaymentToken: `0x${string}`): bigint {
    if (toPaymentToken !== zeroAddress) throw new Error(`Token(${toPaymentToken}) not supported`)
    return valueInWASM * BigInt(1_000_000)
  }

  /// @dev ttl is expected to be in seconds
  isTTLValid(ttl: number) {
    ttl = ttl * 1000; // convert seconds to milliseconds
    const currentTimestamp = Date.now();
    return currentTimestamp + this.bufferDuration <= ttl;
  }

  private async _mockFailure(id: bigint) {
    const evmClient = this.getEvmClient()

    try {
      const { request } = await evmClient.simulateContract({
        address: this.evmRelayerAddress,
        abi: registrationProxyAbi,
        functionName: 'failure',
        args: [id],
        account: privateKeyToAccount(this.evmSignerKey)
      })
      return request
    } catch (err) {
      if (err instanceof BaseError) {
        const revertError = err.walk(err => err instanceof ContractFunctionRevertedError)
        if (revertError instanceof ContractFunctionRevertedError) {
          console.log(
            `Failure state of RequestId(${id}) couldn't be relayed back with reason(${revertError.reason})`
          )
        }
      }
    }
  }
}

export { AzeroIdRelayer }
