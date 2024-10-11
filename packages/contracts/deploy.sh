#!/usr/bin/env bash
set -eu

# Load Environment
source .env

# Clean
bun run clean

# Deploy & Verify OffchainResolver
bunx hardhat --network $NETWORK deploy --tags gateway --reset