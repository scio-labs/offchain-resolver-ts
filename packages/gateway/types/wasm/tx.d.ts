// Generated by dedot cli

import type { GenericSubstrateApi } from 'dedot/types'
import type { AccountId32Like, Hash } from 'dedot/codecs'
import type {
  GenericContractTx,
  GenericContractTxCall,
  ContractTxOptions,
  ContractSubmittableExtrinsic,
} from 'dedot/contracts'

export interface ContractTx<ChainApi extends GenericSubstrateApi>
  extends GenericContractTx<ChainApi> {
  /**
   *
   * @param {ContractTxOptions} options
   *
   * @selector 0x0848523c
   **/
  fundMe: GenericContractTxCall<
    ChainApi,
    (options: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   *
   * @param {AccountId32Like} account
   * @param {bigint} balance
   * @param {ContractTxOptions} options
   *
   * @selector 0xe7cda623
   **/
  withdrawFunds: GenericContractTxCall<
    ChainApi,
    (
      account: AccountId32Like,
      balance: bigint,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   *
   * @param {bigint} id
   * @param {string} name
   * @param {AccountId32Like} recipient
   * @param {number} yearsToRegister
   * @param {bigint} maxFees
   * @param {ContractTxOptions} options
   *
   * @selector 0x229b553f
   **/
  register: GenericContractTxCall<
    ChainApi,
    (
      id: bigint,
      name: string,
      recipient: AccountId32Like,
      yearsToRegister: number,
      maxFees: bigint,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   *
   * @param {AccountId32Like} controller
   * @param {boolean} enable
   * @param {ContractTxOptions} options
   *
   * @selector 0xc5e161ea
   **/
  setController: GenericContractTxCall<
    ChainApi,
    (
      controller: AccountId32Like,
      enable: boolean,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   *
   * @param {Hash} codeHash
   * @param {ContractTxOptions} options
   *
   * @selector 0x1345543d
   **/
  upgradeContract: GenericContractTxCall<
    ChainApi,
    (codeHash: Hash, options: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   *
   * @param {AccountId32Like | undefined} account
   * @param {ContractTxOptions} options
   *
   * @selector 0x107e33ea
   **/
  transferOwnership: GenericContractTxCall<
    ChainApi,
    (
      account: AccountId32Like | undefined,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   *
   * @param {ContractTxOptions} options
   *
   * @selector 0xb55be9f0
   **/
  acceptOwnership: GenericContractTxCall<
    ChainApi,
    (options: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>
  >
}
