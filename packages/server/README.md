# ENS Offchain Gateway & Registration Relayer for AZERO.ID

> **See [README.md](../../README.md) for more information.**

## Getting Started

### API Info

`/relay` endpoint expects following arguments:

1. `txhash` (mandatory): The EVM transaction that contains the `InitiateRequest` event from our target contract.
2. `reqId` (optional): It is required when a given `txHash` contains more than one `InitiateRequest` event (can happen if someone creates a bulk-registration contract on top).

### Development

```bash
# Install dependencies
bun install

# Create `.dev.vars` & Set your private key
cp .dev.vars.example .dev.vars

# [Optional] Edit `wrangler.toml` if needed

# [Optional] (Re)generate contract types from (Solidity & ink!)
bunx wagmi generate
bunx dedot typink -m /path/to/contract/metadata.json -o ./types/contract-name

# Run development server
bun run dev

# Build for production
bun run build
```

### Deployment

```bash
# Put your private key in the Cloudflare secrets manager
bunx wrangler secret put OG_PRIVATE_KEY --env <testnet|mainnet>
bunx wrangler secret put INFURA_API_KEY --env <testnet|mainnet>
bunx wrangler secret put EVM_RELAYER_PRIVATE_KEY --env <testnet|mainnet>
bunx wrangler secret put WASM_PRIVATE_KEY --env <testnet|mainnet>

# Deploy the worker
bunx wrangler deploy --env <testnet|mainnet>
```
