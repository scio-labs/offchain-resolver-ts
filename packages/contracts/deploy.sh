#!/usr/bin/env bash
set -eu

# Can only be overwritten from the .env file, not from the command line!
NETWORK=sepolia

# Load .env
source .env

# Deploy OffchainResolver
npx hardhat --network $NETWORK deploy --tags demo