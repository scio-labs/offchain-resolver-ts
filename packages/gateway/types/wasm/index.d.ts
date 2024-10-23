// Generated by dedot cli

import type { VersionedGenericSubstrateApi, RpcVersion, RpcV2 } from 'dedot/types'
import type { GenericContractApi } from 'dedot/contracts'
import type { SubstrateApi } from 'dedot/chaintypes'
import type { InkPrimitivesLangError } from './types'
import { ContractQuery } from './query'
import { ContractTx } from './tx'
import { ConstructorQuery } from './constructor-query'
import { ConstructorTx } from './constructor-tx'
import { ContractEvents } from './events'

export * from './types'

/**
 * @name: WasmContractApi
 * @contractName: wasm
 * @contractVersion: 0.1.0
 * @authors: [your_name] <[your_email]>
 * @language: ink! 5.0.0
 **/
export interface WasmContractApi<
  Rv extends RpcVersion = RpcVersion,
  ChainApi extends VersionedGenericSubstrateApi = SubstrateApi,
> extends GenericContractApi<Rv, ChainApi> {
  query: ContractQuery<ChainApi[Rv]>
  tx: ContractTx<ChainApi[Rv]>
  constructorQuery: ConstructorQuery<ChainApi[Rv]>
  constructorTx: ConstructorTx<ChainApi[Rv]>
  events: ContractEvents<ChainApi[Rv]>

  types: {
    LangError: InkPrimitivesLangError
    ChainApi: ChainApi[Rv]
  }
}
