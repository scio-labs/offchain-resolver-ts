import dotenv from "dotenv";

dotenv.config();

export const PRIVATE_KEY = process.env.PRIVATE_KEY;
export const JSON_DB_FILE = process.env.JSON_DB_FILE;
export const PATH_TO_CERT = process.env.CERT_PATH;

if (!PRIVATE_KEY) throw new Error("No private key provided");

if (!JSON_DB_FILE) throw new Error("No sqlite file provided");
