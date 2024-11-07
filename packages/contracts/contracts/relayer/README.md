# Relayer contracts

## [RegistrationProxy](./evm/RegistrationProxy.sol)

It is a solidity contract and is deployed on the EVM chain.

## [Wasm](./wasm/lib.rs)

It is a wasm contract and is deployed on the substrate chain.

## Note

1. Admin is assigned as a controller by default during init (for both `RegistrationProxy` & `wasm`). The admin can assign other accounts as a controller as well by invoking the `setController()` method.

2. `wasm` contract has a payable method `fundMe()` which can be used to fund its reserve.