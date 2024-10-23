// Generated by dedot cli

import type { GenericSubstrateApi } from 'dedot/types'
import type { AccountId32 } from 'dedot/codecs'
import type { GenericContractEvents, GenericContractEvent } from 'dedot/contracts'
import type { InterfacesPsp34StandardId } from './types'

export interface ContractEvents<ChainApi extends GenericSubstrateApi>
  extends GenericContractEvents<ChainApi> {
  /**
   * Emitted whenever a new name is registered.
   *
   *
   **/
  Register: GenericContractEvent<
    'Register',
    {
      /**
       *
       * @indexed: true
       **/
      name: string
      /**
       *
       * @indexed: true
       **/
      from: AccountId32
      /**
       *
       * @indexed: false
       **/
      registrationTimestamp: bigint
      /**
       *
       * @indexed: false
       **/
      expirationTimestamp: bigint
    }
  >

  /**
   *
   *
   **/
  FeeReceived: GenericContractEvent<
    'FeeReceived',
    {
      /**
       *
       * @indexed: true
       **/
      name: string
      /**
       *
       * @indexed: true
       **/
      from: AccountId32
      /**
       *
       * @indexed: true
       **/
      referrer: string | undefined
      /**
       *
       * @indexed: false
       **/
      referrerAddr: AccountId32 | undefined
      /**
       *
       * @indexed: false
       **/
      receivedFee: bigint
      /**
       *
       * @indexed: false
       **/
      forwardedReferrerFee: bigint
    }
  >

  /**
   * Emitted whenever a name is released
   *
   *
   **/
  Release: GenericContractEvent<
    'Release',
    {
      /**
       *
       * @indexed: true
       **/
      name: string
      /**
       *
       * @indexed: true
       **/
      from: AccountId32
    }
  >

  /**
   * Emitted whenever an address changes.
   *
   *
   **/
  SetAddress: GenericContractEvent<
    'SetAddress',
    {
      /**
       *
       * @indexed: true
       **/
      name: string
      /**
       *
       * @indexed: false
       **/
      from: AccountId32
      /**
       *
       * @indexed: true
       **/
      oldAddress: AccountId32 | undefined
      /**
       *
       * @indexed: true
       **/
      newAddress: AccountId32
    }
  >

  /**
   * Emitted whenever controller changes.
   *
   *
   **/
  SetController: GenericContractEvent<
    'SetController',
    {
      /**
       *
       * @indexed: true
       **/
      name: string
      /**
       *
       * @indexed: false
       **/
      from: AccountId32
      /**
       *
       * @indexed: true
       **/
      oldController: AccountId32 | undefined
      /**
       *
       * @indexed: true
       **/
      newController: AccountId32
    }
  >

  /**
   *
   *
   **/
  SetPrimaryName: GenericContractEvent<
    'SetPrimaryName',
    {
      /**
       *
       * @indexed: true
       **/
      account: AccountId32
      /**
       *
       * @indexed: true
       **/
      primaryName: string | undefined
    }
  >

  /**
   *
   *
   **/
  RecordsUpdated: GenericContractEvent<
    'RecordsUpdated',
    {
      /**
       *
       * @indexed: true
       **/
      name: string
      /**
       *
       * @indexed: false
       **/
      from: AccountId32
    }
  >

  /**
   * Event emitted when a token transfer occurs.
   *
   *
   **/
  Transfer: GenericContractEvent<
    'Transfer',
    {
      /**
       *
       * @indexed: true
       **/
      from: AccountId32 | undefined
      /**
       *
       * @indexed: true
       **/
      to: AccountId32 | undefined
      /**
       *
       * @indexed: true
       **/
      id: InterfacesPsp34StandardId
    }
  >

  /**
   * Event emitted when a token is locked.
   *
   *
   **/
  Lock: GenericContractEvent<
    'Lock',
    {
      /**
       *
       * @indexed: true
       **/
      name: string
      /**
       *
       * @indexed: true
       **/
      caller: AccountId32
      /**
       *
       * @indexed: true
       **/
      unlocker: AccountId32
    }
  >

  /**
   * Event emitted when a token is unlocked.
   *
   *
   **/
  Unlock: GenericContractEvent<
    'Unlock',
    {
      /**
       *
       * @indexed: true
       **/
      name: string
    }
  >

  /**
   * Event emitted when a token approve occurs.
   *
   *
   **/
  Approval: GenericContractEvent<
    'Approval',
    {
      /**
       *
       * @indexed: true
       **/
      owner: AccountId32
      /**
       *
       * @indexed: true
       **/
      operator: AccountId32
      /**
       *
       * @indexed: true
       **/
      id: InterfacesPsp34StandardId | undefined
      /**
       *
       * @indexed: false
       **/
      approved: boolean
    }
  >

  /**
   * Emitted when switching from whitelist-phase to public-phase
   *
   *
   **/
  PublicPhaseActivated: GenericContractEvent<'PublicPhaseActivated', {}>

  /**
   * Emitted when a name is reserved or removed from the reservation list
   *
   *
   **/
  Reserve: GenericContractEvent<
    'Reserve',
    {
      /**
       *
       * @indexed: true
       **/
      name: string
      /**
       *
       * @indexed: true
       **/
      accountId: AccountId32 | undefined
      /**
       *
       * @indexed: false
       **/
      action: boolean
    }
  >

  /**
   * Emitted whenever a name is renewed.
   *
   *
   **/
  Renew: GenericContractEvent<
    'Renew',
    {
      /**
       *
       * @indexed: true
       **/
      name: string
      /**
       *
       * @indexed: false
       **/
      oldExpiry: bigint
      /**
       *
       * @indexed: false
       **/
      newExpiry: bigint
    }
  >
}