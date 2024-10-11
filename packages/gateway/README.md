# ENS Offchain Gateway for Aleph Zero – Gateway Server (Worker)

> **See [README.md](../../README.md) for more information.**

## Getting Started

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

# Deploy the worker
bunx wrangler deploy --env <testnet|mainnet>
```
