import { ethers } from 'ethers';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import { KeyringPair } from '@polkadot/keyring/types';
import { WeightV2 } from '@polkadot/types/interfaces';
import evmABI from './artefacts/evm.json';
import wasmABI from './artefacts/wasm.json';
import { GasLimit } from './utils';

export class Relayer {
  evm: ethers.Contract;
  wasm: ContractPromise;
  wasmSigner: KeyringPair;
  wasmGasLimit: WeightV2;

  constructor(
    evm: ethers.Contract,
    wasm: ContractPromise,
    wasmSigner: KeyringPair,
    wasmGasLimit: WeightV2
  ) {
    this.evm = evm;
    this.wasm = wasm;
    this.wasmSigner = wasmSigner;
    this.wasmGasLimit = wasmGasLimit;
  }

  static async init(
    evmProviderURL: string,
    evmAddr: string,
    wasmProviderURL: string,
    wasmAddr: string,
    wasmSigner: KeyringPair,
    wasmGasLimit: GasLimit
  ): Promise<Relayer> {
    const evmProvider = ethers.getDefaultProvider(evmProviderURL);
    const evm = new ethers.Contract(evmAddr, evmABI, evmProvider);

    const wsProvider = new WsProvider(wasmProviderURL);
    const api = await ApiPromise.create({ provider: wsProvider });
    const wasm = new ContractPromise(api, wasmABI, wasmAddr);
    const weightV2 = api.registry.createType(
      'WeightV2',
      wasmGasLimit
    ) as WeightV2;

    return new Relayer(evm, wasm, wasmSigner, weightV2);
  }

  start() {
    this.evm.on(
      'InitiateRequest',
      (id, name, recipient, yearsToRegister, value, ttl) => {
        console.log('New request:', Number(id), name, ttl);
        // TODO: Check ttl is valid
        this.executeRequest(
          Number(id),
          name,
          recipient,
          Number(yearsToRegister),
          value
        );
      }
    );
  }

  async executeRequest(
    id: number,
    name: string,
    recipient: string,
    yearsToRegister: number,
    maxFeesInEVM: number
  ) {
    const maxFeesInWASM = this.valueEVM2WASM(maxFeesInEVM);

    // TODO: first dry-run to save Tx which would fail

    await this.wasm.tx
      .register(
        {
          gasLimit: this.wasmGasLimit,
        },
        id,
        name,
        recipient,
        yearsToRegister,
        maxFeesInWASM
      )
      .signAndSend(this.wasmSigner, ({ events = [], status }) => {
        if (status.isFinalized) {
          let successEventRecord = events.find(eventRecord => {
            const isContractEvent = this.wasm.api.events.contracts
              .ContractEmitted.is;
            const verifyEventEmitter = (addr: any) =>
              eventRecord.event.data.at(0)?.eq(addr);

            const successEventExists = (eventRecord: any, id: number) => {
              const decoded = this.wasm.abi.decodeEvent(eventRecord);
              const emittedID = Number(decoded.args[0]);
              return (
                decoded.event.identifier ===
                  'wasm::registration_proxy::Success' && emittedID === id
              );
            };

            return (
              isContractEvent(eventRecord.event) &&
              verifyEventEmitter(this.wasm.address) &&
              successEventExists(eventRecord, id)
            );
          });

          if (successEventRecord === undefined) {
            // Failure
            console.log('Failed to register');
          } else {
            // Success
            const decoded = this.wasm.abi.decodeEvent(successEventRecord);
            const priceInWASM = Number(decoded.args[1]);
            console.log('Registered successfully with price:', priceInWASM);
          }
        }
      });
  }

  private valueEVM2WASM(valueInEVM: number) {
    // TODO: set value converter properly
    return valueInEVM + 10000000000000;
  }
}
