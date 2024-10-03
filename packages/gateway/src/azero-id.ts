import abi from './artefacts/azns_registry.json';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Database } from './server';
import { ContractPromise } from '@polkadot/api-contract';
import type { WeightV2 } from '@polkadot/types/interfaces';
import { getCoderByCoinType } from "@ensdomains/address-encoder";
import { createDotAddressDecoder } from '@ensdomains/address-encoder/utils'
import { hexlify } from 'ethers/lib/utils';
import { GasLimit } from './utils';

const AZERO_COIN_TYPE = 643;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const EMPTY_CONTENT_HASH = '0x';

export class AzeroId implements Database {
  ttl: number;
  tldToContract: Map<string, ContractPromise>;
  maxGasLimit: WeightV2;

  constructor(ttl: number, tldToContract: Map<string, ContractPromise>, maxGasLimit: WeightV2) {
    this.ttl = ttl;
    this.tldToContract = tldToContract;
    this.maxGasLimit = maxGasLimit;
  }

  static async init(ttl: number, providerURL: string, tldToContractAddress: Map<string, string>, gasLimit: GasLimit) {
    const wsProvider = new WsProvider(providerURL);
    const api = await ApiPromise.create({ provider: wsProvider });
    
    const tldToContract = new Map<string, ContractPromise>();
    tldToContractAddress.forEach((addr, tld) => {
      tldToContract.set(tld, new ContractPromise(api, abi, addr))
    })

    const maxGasLimit = api.registry.createType('WeightV2', gasLimit) as WeightV2;

    return new AzeroId(
        ttl,
        tldToContract,
        maxGasLimit,
    );
  }

  async addr(name: string, coinType: number) {
    coinType = Number(coinType); // convert BigNumber to number
    console.log("addr", name, coinType);
    
    let value;
    if (coinType == AZERO_COIN_TYPE) {
      value = await this.fetchA0ResolverAddress(name);
    } else {
      let alias = AzeroId.getAlias(""+coinType);
      if (alias !== undefined) {
        const serviceKey = "address." + alias;
        value = await this.fetchRecord(name, serviceKey);
      }
      if (value === undefined) {
        const serviceKey = "address." + coinType;
        value = await this.fetchRecord(name, serviceKey);
      }
    }

    if (value === undefined) {
      value = coinType == 60? ZERO_ADDRESS:'0x';
    } else {
      value = AzeroId.encodeAddress(value, coinType);
    }

    return { addr: value, ttl: this.ttl };
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

  private async fetchRecord(domain: string, key: string) {
    let {name, contract} = this.processName(domain);
    const resp: any = await contract.query.getRecord(
      '',
      {
        gasLimit: this.maxGasLimit
      },
      name,
      key
    );
    
    return resp.output?.toHuman().Ok.Ok;
  }

  private async fetchA0ResolverAddress(domain: string) {
    let {name, contract} = this.processName(domain);
    const resp: any = await contract.query.getAddress(
      '',
      {
        gasLimit: this.maxGasLimit
      },
      name
    );

    return resp.output?.toHuman().Ok.Ok;
  }

  private processName(domain: string) {
    const labels = domain.split('.');
    console.log("Labels:", labels);

    const name = labels.shift() || '';
    const tld = labels.join('.');
    const contract = this.tldToContract.get(tld);

    if (contract === undefined) {
      throw new Error(`TLD (.${tld}) not supported`);
    }

    return {name, contract};
  }

  static getAlias(coinType: string) {
    const alias = new Map<string, string>([
      ['0', 'btc'],
      ['60', 'eth'],
      ['354', 'dot'],
      ['434', 'ksm'],
      ['501', 'sol'],
    ]);

    return alias.get(coinType);
  }

  static encodeAddress(addr: string, coinType: number) {
    const isEvmCoinType = (c: number) => {
      return c == 60 || (c & 0x80000000)!=0
    }

    if (coinType == AZERO_COIN_TYPE) {
      const azeroCoder = createDotAddressDecoder(42);
      return hexlify(azeroCoder(addr));
    }
    if (isEvmCoinType(coinType) && !addr.startsWith('0x')) {
      addr = '0x' + addr;
    }

    try {
      const coder = getCoderByCoinType(coinType);
      return hexlify(coder.decode(addr));
    } catch {
      return addr;
    }
  }
}
