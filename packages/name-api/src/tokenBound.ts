import {TokenboundClient} from "@tokenbound/sdk";

export function getTokenBoundAccount(chainId: number, tokenContract: `0x${string}`, tokenId: `0x${string}`){

	const tbaClient = new TokenboundClient({
		chainId
	});

	return tbaClient.getAccount({tokenContract, tokenId});
}