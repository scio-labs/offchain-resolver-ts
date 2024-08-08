import abi from './metadata.json';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Database } from './server';
import { ContractPromise } from '@polkadot/api-contract';
import type { WeightV2 } from '@polkadot/types/interfaces';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const EMPTY_CONTENT_HASH = '0x';

export interface GasLimit {
  refTime: number,
  proofSize: number,
}

export class AzeroId implements Database {
  ttl: number;
  contract: ContractPromise;
  maxGasLimit: WeightV2;

  constructor(ttl: number, contract: ContractPromise, maxGasLimit: WeightV2) {
    this.ttl = ttl;
    this.contract = contract;
    this.maxGasLimit = maxGasLimit;
  }

  static async init(ttl: number, providerURL: string, contractAddress: string, gasLimit: GasLimit) {
    const wsProvider = new WsProvider(providerURL);
    const api = await ApiPromise.create({ provider: wsProvider });
    const contract = new ContractPromise(api, abi, contractAddress);
    const maxGasLimit = api.registry.createType('WeightV2', gasLimit) as WeightV2;

    return new AzeroId(
        ttl,
        contract,
        maxGasLimit,
    );
  }

  addr(name: string, coinType: number) {
    console.log("addr", name, coinType);
    return { addr: ZERO_ADDRESS, ttl: this.ttl };
  }

  async text(name: string, key: string) {
    console.log("text", name, key);
    const value = await this.fetchRecord(name, key) || '';
    return { value, ttl: this.ttl };
  }

  contenthash(name: string) {
    console.log("contenthash", name);
    return { contenthash: EMPTY_CONTENT_HASH, ttl: this.ttl };
  }

  private async fetchRecord(name: string, key: string) {
    name = this.processName(name);
    const resp: any = await this.contract.query.getRecord(
      '',
      {
        gasLimit: this.maxGasLimit
      },
      name,
      key
    );
    
    return resp.output?.toHuman().Ok.Ok;
  }

  private processName(domain: string) {
    // TODO: maybe add it as a class variable
    const supportedTLDs = ['azero', 'tzero'];
    const labels = domain.split('.');
    console.log("Labels:", labels);

    const name = labels.shift();
    if(labels.length != 0) {
      const tld = labels.join('.');
      if (!supportedTLDs.includes(tld)) 
        throw new Error(`TLD (.${tld}) not supported`);
    }

    return name || '';
  }
}
