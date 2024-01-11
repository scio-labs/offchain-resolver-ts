import dotenv from "dotenv";

dotenv.config();

export const PRIVATE_KEY = process.env.PRIVATE_KEY;
export const SQLite_DB_FILE = process.env.SQLite_DB_FILE;
export const PATH_TO_CERT = process.env.CERT_PATH;

if (!PRIVATE_KEY) throw new Error("No private key provided");
if (!SQLite_DB_FILE) throw new Error("No Sqlite file provided");

// RPC URL is not actually needed for calculating TBA addresses but may be needed for other function in the future
/*export const CHAIN_CONFIG = {
	137: {
		rpcUrl: "https://polygon-mainnet.infura.io/v3/3ca8f1ba91f84e1f97c99f6218fe3743"
	},
	80001: {
		rpcUrl: "https://polygon-mumbai.g.alchemy.com/v2/rVI6pOV4irVsrw20cJxc1fxK_1cSeiY0"
	},
	5: {
		rpcUrl: "https://ethereum-goerli.publicnode.com"
	}
}*/


export const CONTRACT_CONFIG = {
	// Smartcat production
	"137-0xD5cA946AC1c1F24Eb26dae9e1A53ba6a02bd97Fe": {
		baseName: "thesmartcats.eth"
	},
	// Smartcat mumbai
	"80001-0x614cF3021705977c2eF4beb9D7f10a6bF4EAEBF6": {
		baseName: "smartcats.eth"
	},
	// Goerli test
	"5-0x2483e332d97C9DaeA4508c1C4F5BEE4a90469229": {
		baseName: "smartcat.eth"
	}
};
