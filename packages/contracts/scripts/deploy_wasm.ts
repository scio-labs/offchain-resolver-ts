import { Keyring } from '@polkadot/keyring'
import { LegacyClient, WsProvider } from 'dedot'
import { ContractDeployer, ContractMetadata } from 'dedot/contracts'
import { stringToHex } from 'dedot/utils'
import dotenv from 'dotenv'
import { readFile } from 'fs/promises'

dotenv.config();

async function main() {
  // Destructure environment variables
  const {
    WASM_PRIVATE_KEY,
    RPC_URL,
    WASM_PATH,
    ABI_PATH,
    ADMIN,
    REGISTRY_ADDR,
  } = process.env
  if (
    !WASM_PRIVATE_KEY ||
    !RPC_URL ||
    !WASM_PATH ||
    !ABI_PATH ||
    !ADMIN ||
    !REGISTRY_ADDR
  ) {
    throw new Error('Missing environment variables')
  }

  // instanciate an api client
  const provider = new WsProvider(RPC_URL)
  const client = await LegacyClient.new({
      provider,
      cacheMetadata: false,
  })

  // create a ContractDeployer instance
  const wasm = await readFile(WASM_PATH)
  const abi = JSON.parse(await readFile(ABI_PATH,'utf-8'))
  const deployer = new ContractDeployer(
    client, 
    abi as ContractMetadata, 
    wasm as unknown as string
  )

  // Dry run the constructor call for validation and gas estimation
  const signer = new Keyring().createFromUri(WASM_PRIVATE_KEY)
  const salt = stringToHex(""+Math.random())
  const { raw } = await deployer.query.new(ADMIN, REGISTRY_ADDR, { caller: signer.address, salt })

  // Submitting the transaction to instanciate the contract
  let contractAddress: string
  await deployer.tx.new(ADMIN, REGISTRY_ADDR, { gasLimit: raw.gasRequired, salt })
  .signAndSend(signer, ({ status, events}) => { 
    if (status.type === 'Finalized') {
      const instantiatedEvent = client.events.contracts.Instantiated.find(events)
      contractAddress = instantiatedEvent.palletEvent.data.contract.address()
    }    
  });

  const waitForResponse = (): Promise<string> => {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (contractAddress !== undefined) {
          clearInterval(interval)
          resolve(contractAddress)
        }
      }, 1000)
    })
  }

  return waitForResponse()
}

main()
  .then((contractAddress) => {
    console.log("Deployed address:", contractAddress)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => process.exit(0))
  