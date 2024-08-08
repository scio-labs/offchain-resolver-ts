import { Database } from './server';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const EMPTY_CONTENT_HASH = '0x';

export class AzeroId implements Database {
  ttl: number;

  constructor(ttl: number) {
    this.ttl = ttl;
  }

  static init(ttl: number) {
    return new AzeroId(
        ttl,
    );
  }

  addr(name: string, coinType: number) {
    console.log("addr", name, coinType);
    return { addr: ZERO_ADDRESS, ttl: this.ttl };
  }

  text(name: string, key: string) {
    console.log("text", name, key);
    return { value: '', ttl: this.ttl };
  }

  contenthash(name: string) {
    console.log("contenthash", name);
    return { contenthash: EMPTY_CONTENT_HASH, ttl: this.ttl };
  }
}
