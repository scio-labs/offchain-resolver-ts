import dotenv from "dotenv";

dotenv.config();

export const PRIVATE_KEY = process.env.PRIVATE_KEY;
export const JSON_FILE = process.env.JSON_FILE;
export const TTL = process.env.TTL;

if (!PRIVATE_KEY) throw new Error("No private key provided");

if (!JSON_FILE) throw new Error("No sqlite file provided");

if (!TTL) throw new Error("No ttl provided");
