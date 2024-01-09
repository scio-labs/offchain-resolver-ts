import dotenv from "dotenv";

dotenv.config();

export const PRIVATE_KEY = process.env.PRIVATE_KEY;
export const SQLite_DB_FILE = process.env.SQLite_DB_FILE;
export const PATH_TO_CERT = process.env.CERT_PATH;

if (!PRIVATE_KEY) throw new Error("No private key provided");
if (!SQLite_DB_FILE) throw new Error("No Sqlite file provided");
