import { KVNamespace } from '@cloudflare/workers-types'
import type { IStorage } from '@dedot/storage'

export class KVCacheStorage implements IStorage {
  constructor(private kv: KVNamespace) {}

  async get(key: string) {
    return this.kv.get(key)
  }
  async set(key: string, value: string) {
    await this.kv.put(key, value)
    return value
  }
  async remove(key: string) {
    return await this.kv.delete(key)
  }
  async keys() {
    // HACK To speed up cache hits as dedot only checks if a key exists that starts with `RAW_META/`.
    //      See https://github.com/dedotdev/dedot/blob/80e64c7da483c4f5b757f6af7259aa4fdd5397fc/packages/api/src/client/BaseSubstrateClient.ts#L151-L153
    return ['RAW_META/']

    // const { keys } = await this.kv.list()
    // return keys.map((k) => k.name)
  }
  async clear() {
    const keys = await this.keys()
    for (const key of keys) {
      await this.kv.delete(key)
    }
  }
  async length() {
    const keys = await this.keys()
    return keys.length
  }
}
