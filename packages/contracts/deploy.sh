#!/usr/bin/env bash
set -eu

# Load Environment
source .env

# Clean
bun run clean

echo "Deploying GATEWAY contracts..."
# Deploy & Verify OffchainResolver
bunx hardhat --network $NETWORK deploy --tags gateway --reset

echo "Deploying RELAYER contracts..."
# Deploy & Verify RegistrationProxy
bunx hardhat --network $NETWORK deploy --tags relayer --reset

# Deploy wasm contract
bunx ts-node scripts/deploy_wasm.ts

# Verify Manually
# bunx hardhat verify --network sepolia <address> --constructor-args <file>.js