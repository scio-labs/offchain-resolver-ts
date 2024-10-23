// Generated by dedot cli

import type { GenericSubstrateApi } from 'dedot/types'
import type { AccountId32Like, FixedBytes, BytesLike } from 'dedot/codecs'
import type {
  GenericContractTx,
  GenericContractTxCall,
  ContractTxOptions,
  ContractSubmittableExtrinsic,
} from 'dedot/contracts'
import type { InterfacesPsp34StandardIdLike } from './types'

export interface ContractTx<ChainApi extends GenericSubstrateApi>
  extends GenericContractTx<ChainApi> {
  /**
   * Register specific name on behalf of some other address.
   * Pay the fee, but forward the ownership of the name to the provided recipient
   *
   * NOTE: During the whitelist phase, use `register()` method instead.
   *
   * @param {string} name
   * @param {AccountId32Like} recipient
   * @param {number} yearsToRegister
   * @param {string | undefined} referrer
   * @param {string | undefined} bonusName
   * @param {ContractTxOptions} options
   *
   * @selector 0x7aa26a96
   **/
  registerOnBehalfOf: GenericContractTxCall<
    ChainApi,
    (
      name: string,
      recipient: AccountId32Like,
      yearsToRegister: number,
      referrer: string | undefined,
      bonusName: string | undefined,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   * Register specific name with caller as owner.
   *
   * @param {string} name
   * @param {number} yearsToRegister
   * @param {string | undefined} referrer
   * @param {string | undefined} bonusName
   * @param {boolean} setAsPrimaryName
   * @param {ContractTxOptions} options
   *
   * @selector 0xb16554be
   **/
  registerV2: GenericContractTxCall<
    ChainApi,
    (
      name: string,
      yearsToRegister: number,
      referrer: string | undefined,
      bonusName: string | undefined,
      setAsPrimaryName: boolean,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   * register_v1
   *
   * @param {string} name
   * @param {number} yearsToRegister
   * @param {string | undefined} referrer
   * @param {Array<FixedBytes<32>> | undefined} merkleProof
   * @param {boolean} setAsPrimaryName
   * @param {ContractTxOptions} options
   *
   * @selector 0x229b553f
   **/
  register: GenericContractTxCall<
    ChainApi,
    (
      name: string,
      yearsToRegister: number,
      referrer: string | undefined,
      merkleProof: Array<FixedBytes<32>> | undefined,
      setAsPrimaryName: boolean,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   *
   * @param {string} name
   * @param {number} yearsToRenew
   * @param {string | undefined} bonusName
   * @param {ContractTxOptions} options
   *
   * @selector 0xb5604092
   **/
  renew: GenericContractTxCall<
    ChainApi,
    (
      name: string,
      yearsToRenew: number,
      bonusName: string | undefined,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   *
   * @param {Array<[string, number, string | undefined]>} data
   * @param {ContractTxOptions} options
   *
   * @selector 0xb3d33208
   **/
  batchRenew: GenericContractTxCall<
    ChainApi,
    (
      data: Array<[string, number, string | undefined]>,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   * Allows users to claim their reserved name at zero cost
   *
   * @param {string} name
   * @param {boolean} setAsPrimaryName
   * @param {ContractTxOptions} options
   *
   * @selector 0x2251f2bc
   **/
  claimReservedName: GenericContractTxCall<
    ChainApi,
    (
      name: string,
      setAsPrimaryName: boolean,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   * Release name from registration.
   *
   * @param {string} name
   * @param {ContractTxOptions} options
   *
   * @selector 0x3f2be152
   **/
  release: GenericContractTxCall<
    ChainApi,
    (name: string, options: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   * Transfer owner to another address.
   *
   * @param {AccountId32Like} to
   * @param {string} name
   * @param {boolean} keepRecords
   * @param {boolean} keepController
   * @param {boolean} keepResolving
   * @param {BytesLike} data
   * @param {ContractTxOptions} options
   *
   * @selector 0x84a15da1
   **/
  transfer: GenericContractTxCall<
    ChainApi,
    (
      to: AccountId32Like,
      name: string,
      keepRecords: boolean,
      keepController: boolean,
      keepResolving: boolean,
      data: BytesLike,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   * Removes the associated state of expired-names from storage
   *
   * @param {Array<string>} names
   * @param {ContractTxOptions} options
   *
   * @selector 0xd00a53e5
   **/
  clearExpiredNames: GenericContractTxCall<
    ChainApi,
    (names: Array<string>, options: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   * Set primary name of an address (reverse record)
   * @note if name is set to None then the primary-name for the caller will be removed (if exists)
   *
   * @param {string | undefined} primaryName
   * @param {ContractTxOptions} options
   *
   * @selector 0xad11843c
   **/
  setPrimaryName: GenericContractTxCall<
    ChainApi,
    (
      primaryName: string | undefined,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   * Set resolved address for specific name.
   *
   * @param {string} name
   * @param {AccountId32Like} newAddress
   * @param {ContractTxOptions} options
   *
   * @selector 0xb8a4d3d9
   **/
  setAddress: GenericContractTxCall<
    ChainApi,
    (
      name: string,
      newAddress: AccountId32Like,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   *
   * @param {string} name
   * @param {AccountId32Like} newController
   * @param {ContractTxOptions} options
   *
   * @selector 0xc5e161ea
   **/
  setController: GenericContractTxCall<
    ChainApi,
    (
      name: string,
      newController: AccountId32Like,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   *
   * @param {Array<string>} names
   * @param {ContractTxOptions} options
   *
   * @selector 0x955299c9
   **/
  resetResolvedAddress: GenericContractTxCall<
    ChainApi,
    (names: Array<string>, options: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   *
   * @param {Array<string>} names
   * @param {ContractTxOptions} options
   *
   * @selector 0x1dffd33a
   **/
  resetController: GenericContractTxCall<
    ChainApi,
    (names: Array<string>, options: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   *
   * @param {string} name
   * @param {Array<[string, string | undefined]>} records
   * @param {boolean} removeRest
   * @param {ContractTxOptions} options
   *
   * @selector 0xde84a1ba
   **/
  updateRecords: GenericContractTxCall<
    ChainApi,
    (
      name: string,
      records: Array<[string, string | undefined]>,
      removeRest: boolean,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   * (ADMIN-OPERATION)
   * Transfers `value` amount of tokens to the caller.
   *
   * @param {AccountId32Like | undefined} beneficiary
   * @param {bigint | undefined} value
   * @param {ContractTxOptions} options
   *
   * @selector 0x410fcc9d
   **/
  withdraw: GenericContractTxCall<
    ChainApi,
    (
      beneficiary: AccountId32Like | undefined,
      value: bigint | undefined,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   * (ADMIN-OPERATION)
   * Reserve name name for specific addresses
   *
   * @param {Array<[string, AccountId32Like | undefined]>} set
   * @param {boolean} skipNameChecker
   * @param {ContractTxOptions} options
   *
   * @selector 0x6e0d3fa8
   **/
  addReservedNames: GenericContractTxCall<
    ChainApi,
    (
      set: Array<[string, AccountId32Like | undefined]>,
      skipNameChecker: boolean,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   * (ADMIN-OPERATION)
   * Remove given names from the list of reserved names
   *
   * @param {Array<string>} set
   * @param {ContractTxOptions} options
   *
   * @selector 0x9ccff6c5
   **/
  removeReservedName: GenericContractTxCall<
    ChainApi,
    (set: Array<string>, options: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   * (ADMIN-OPERATION)
   * Update the limit of records allowed to store per name
   *
   * @param {number | undefined} limit
   * @param {ContractTxOptions} options
   *
   * @selector 0x7c9baef6
   **/
  setRecordsSizeLimit: GenericContractTxCall<
    ChainApi,
    (
      limit: number | undefined,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
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

  /**
   *
   * @param {FixedBytes<32>} codeHash
   * @param {ContractTxOptions} options
   *
   * @selector 0x1345543d
   **/
  upgradeContract: GenericContractTxCall<
    ChainApi,
    (codeHash: FixedBytes<32>, options: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   *
   * @param {AccountId32Like} operator
   * @param {InterfacesPsp34StandardIdLike | undefined} id
   * @param {boolean} approved
   * @param {ContractTxOptions} options
   *
   * @selector 0x1932a8b0
   **/
  psp34Approve: GenericContractTxCall<
    ChainApi,
    (
      operator: AccountId32Like,
      id: InterfacesPsp34StandardIdLike | undefined,
      approved: boolean,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   *
   * @param {AccountId32Like} to
   * @param {InterfacesPsp34StandardIdLike} id
   * @param {BytesLike} data
   * @param {ContractTxOptions} options
   *
   * @selector 0x3128d61b
   **/
  psp34Transfer: GenericContractTxCall<
    ChainApi,
    (
      to: AccountId32Like,
      id: InterfacesPsp34StandardIdLike,
      data: BytesLike,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   *
   * @param {string} uri
   * @param {ContractTxOptions} options
   *
   * @selector 0x4de6850b
   **/
  psp34TraitsSetBaseUri: GenericContractTxCall<
    ChainApi,
    (uri: string, options: ContractTxOptions) => ContractSubmittableExtrinsic<ChainApi>
  >

  /**
   *
   * @param {InterfacesPsp34StandardIdLike} tokenId
   * @param {Array<[string, string]>} metadata
   * @param {ContractTxOptions} options
   *
   * @selector 0x5bf8416b
   **/
  psp34TraitsSetMultipleAttributes: GenericContractTxCall<
    ChainApi,
    (
      tokenId: InterfacesPsp34StandardIdLike,
      metadata: Array<[string, string]>,
      options: ContractTxOptions,
    ) => ContractSubmittableExtrinsic<ChainApi>
  >
}