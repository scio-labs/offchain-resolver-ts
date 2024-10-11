# ENS Offchain Gateway for Aleph Zero – Gateway Server (Worker)

> **See [README.md](../../README.md) for more information.**

## Getting Started

### Development

```bash
# Install dependencies
bun install

# Create `.dev.vars` & Set your private key
cp .dev.vars.example .dev.vars

# Edit `wrangler.toml` if needed

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
