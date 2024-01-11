import {TokenboundClient} from "@tokenbound/sdk";
import {Chain, polygonMumbai} from "viem/chains";

export function getTokenBoundAccount(chainId: number, tokenContract: `0x${string}`, tokenId: `0x${string}`){

	const chain = chainId == 80001 ? (polygonMumbai as unknown as Chain) : undefined

	const tbaClient = new TokenboundClient({
		chainId,
		chain
	});

	return tbaClient.getAccount({tokenContract, tokenId});
}