# ENS Offchain Gateway for Aleph Zero

<a href="https://alephzero.org/ecosystem-funding-program" target="_blank"><img src="https://alephzero.org/storage/efp-logo-big-1707490943Oz2Jb.png" alt="Aleph Zero EFP" width="150px" /></a><br/>

This repository is a fork of the [ENS Offchain Resolver](https://github.com/ensdomains/offchain-resolver) repository, maintained by [Scio Labs](https://scio.xyz). It supports ENS address resolution on EVM ([EIP 3668](https://eips.ethereum.org/EIPS/eip-3668), [ENSIP 10](https://docs.ens.domains/ens-improvement-proposals/ensip-10-wildcard-resolution)) via the Aleph Zero Substrate network.
It specifically targets the [AZERO.ID](https://azero.id) registry, though, it can be easily extended to support other Substrate-based networks and protocols.

## Deployments

> [!IMPORTANT]
>
> This project is still under active development.

|                       | **Testnet¹**                                 | **Mainnet²**                                 |
| --------------------- | -------------------------------------------- | -------------------------------------------- |
| **Resolver Contract** | `0x5cf63C14b82C6E1B95023d8D23e682d12761F56C` | `0x723f6C968609F62583504DD67307A4Ae4c9Fd886` |
| **Gateway**           | https://tzero-id-gateway.nameverse.io        | https://azero-id-gateway.nameverse.io        |
| **ENS Domain**        | `*.tzero-id.eth`, `tzero.eth`                | `*.azero-id.eth`                             |

<small style="opacity: 0.5;">
  <strong>¹ Testnet:</strong> Ethereum Sepolia & Aleph Zero Testnet<br/>
  <strong>² Mainnet:</strong> Ethereum Mainnet & Aleph Zero Mainnet<br/>
</small>

## Packages

### [Solidity Contracts](packages/contracts)

The smart contract provides a resolver stub that implement CCIP Read (EIP 3668) and ENS wildcard resolution (ENSIP 10). When queried for a name, it directs the client to query the gateway server. When called back with the gateway server response, the resolver verifies the signature was produced by an authorised signer, and returns the response to the client.

### [Gateway Server](packages/gateway)

The gateway server implements CCIP Read (EIP 3668), and answers requests by looking up the names on the registry Aleph Zero. Once a record is retrieved, it is signed using a user-provided key to assert its validity, and both record and signature are returned to the caller so they can be provided to the contract that initiated the request. It's designed to be deployed as a Cloudflare worker.

### [Demo Client](packages/client)

A simple script that resolves a given domain through the ENS protocol (using the gateway server) and verifies the response with the result from the registry contracts directly on the Aleph Zero network.

## Getting Started

> [!IMPORTANT]
>
> - Setup Node.js v20 (recommended via [nvm](https://github.com/nvm-sh/nvm))
> - Install [Bun](https://bun.sh/)
> - Clone this repository

1. Run the gateway server ([packages/gateway/README.md](packages/gateway/README.md))
   1. Use the worker url as environment variable when deploying the contracts
2. Deploy the contracts ([packages/contracts/README.md](packages/contracts/README.md))
   1. Assign the new resolver to your ENS name
3. Use the provided demo client ([packages/client/README.md](packages/client/README.md))
