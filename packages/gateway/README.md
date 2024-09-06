# ENS Offchain Resolver Gateway
This package implements a simple CCIP-read gateway server for ENS offchain resolution.

## Usage:
You can run the gateway as a command line tool; in its default configuration it reads the data to serve from a JSON file specified on the command line:

```
yarn && yarn build
yarn start --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --provider-url <url>
```

`private-key` should be an Ethereum private key that will be used to sign messages. You should configure your resolver contract to expect messages to be signed using the corresponding address.

`<url>` is the websocket endpoint of the target substrate chain (default: wss://ws.test.azero.dev)

## Customisation
The JSON backend is implemented in [json.ts](src/json.ts), and implements the `Database` interface from [server.ts](src/server.ts). You can replace this with your own database service by implementing the methods provided in that interface. If a record does not exist, you should return the zero value for that type - for example, requests for nonexistent text records should be responded to with the empty string, and requests for nonexistent addresses should be responded to with the all-zero address.

For an example of how to set up a gateway server with a custom database backend, see [index.ts](src/index.ts):
```
const signer = new ethers.utils.SigningKey(privateKey);

const db = JSONDatabase.fromFilename(options.data, parseInt(options.ttl));

const app = makeApp(signer, '/', db);
app.listen(parseInt(options.port));
```

## AZERO-ID implementation
The AzeroId gateway implementation in [azero-id.ts](src/azero-id.ts) reads the state from the AZERO-ID registry contract on AlephZero network. [supported-tlds.json](src/supported-tlds.json) stores the TLDs mapped to their target registry. Update it as per need.