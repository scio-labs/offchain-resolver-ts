// Source: https://gist.github.com/sinzii/942f034dcb870c98fde7221c1d61e817

import { $, LegacyClient, WsProvider } from 'dedot'
import { SpWeightsWeightV2Weight } from 'dedot/chaintypes'
import { $AccountId32, $Bytes, $DispatchError, AccountId32Like, BytesLike } from 'dedot/codecs'
import { concatU8a, u8aToHex } from 'dedot/utils'

const $Weight = $.Struct({
  refTime: $.compactU64,
  proofSize: $.compactU64,
})

const CODECS = [$AccountId32, $AccountId32, $.u128, $.Option($Weight), $.Option($.u128), $Bytes]

export async function makeDedotFakeClient(provider: WsProvider) {
  const $ContractResult = $.Struct({
    gasConsumed: $Weight,
    gasRequired: $Weight,
    storageDeposit: $.Enum({
      Refund: $.u128,
      Charge: $.u128,
    }),
    debugMessage: $.PrefixedHex,
    result: $.Result(
      $.Struct({ flags: $.Struct({ bits: $.u32 }), data: $.PrefixedHex }),
      $DispatchError,
    ),
    events: $.Option($.RawHex),
  })

  const client = {
    call: {
      contractsApi: {
        call: async (
          origin: AccountId32Like,
          dest: AccountId32Like,
          value: bigint,
          gasLimit: SpWeightsWeightV2Weight | undefined,
          storageDepositLimit: bigint | undefined,
          inputData: BytesLike,
        ) => {
          const func = 'ContractsApi_call'
          const params = [origin, dest, value, gasLimit, storageDepositLimit, inputData]

          const formattedInputs = params.map((param, index) => CODECS[index].tryEncode(param))
          const bytes = u8aToHex(concatU8a(...formattedInputs))

          const result = await provider.send('state_call', [func, bytes])
          return $ContractResult.tryDecode(result)
        },
      },
    },
  } as unknown as LegacyClient

  return client

  // https://github.com/scio-labs/inkathon/blob/052eb14208d77ed4f592e6310a3f4461872c7ea4/contracts/deployments/greeter/alephzero-testnet.ts#L1
  // const GREETER_CONTRACT_ADDRESS = '5CDia8Y46K7CbD2vLej2SjrvxpfcbrLVqK2He3pTJod2Eyik';

  // const greeter = new Contract<GreeterContractApi>(
  //   fakeClient, greeterMetadata as any, GREETER_CONTRACT_ADDRESS,
  //   { defaultCaller: '5EeG3x2qiUMU8LkRz4WGyy9kFhLY3u1AQwZz9aidvis58jqj' }
  // );
  // const { data: message } = await greeter.query.greet();
  // console.log(message);

  // await provider.disconnect();
}
