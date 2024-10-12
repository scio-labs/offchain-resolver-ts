# ENS Offchain Gateway for Aleph Zero – Solidity Contracts

> **See [README.md](../../README.md) for more information.**

## Contracts

### [IExtendedResolver.sol](contracts/IExtendedResolver.sol)

This is the interface for wildcard resolution specified in ENSIP 10. In time this will likely be moved to the [@ensdomains/ens-contracts](https://github.com/ensdomains/ens-contracts) repository.

### [SignatureVerifier.sol](contracts/SignatureVerifier.sol)

This library facilitates checking signatures over CCIP read responses.

### [OffchainResolver.sol](contracts/OffchainResolver.sol)

This contract implements the offchain resolution system. Set this contract as the resolver for a name, and that name and all its subdomains that are not present in the ENS registry will be resolved via the provided gateway by supported clients.

## Getting Started

```bash
# Install dependencies
bun install

# Create `.env` & Set all variables
cp .env.example .env

# Deploy & verify contracts
./deploy.sh
```
