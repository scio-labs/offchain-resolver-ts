// @ts-nocheck
import fastify from "fastify";
import { ethers } from "ethers";
import { JSONDatabase } from "./json";
import { PRIVATE_KEY, JSON_FILE, TTL } from "./constants";

const address: string = ethers.computeAddress(PRIVATE_KEY);
const signer: ethers.SigningKey = new ethers.SigningKey(PRIVATE_KEY);
const db: JSONDatabase = JSONDatabase.fromFilename(
  JSON_FILE,
  parseInt(TTL, 10)
);

const app = fastify();

app.get("/", async () => {
  return "hello world";
});

app.get("/:name/:tokenId/:signature", async (request, reply) => {
  const { name, tokenId, signature } = request.params;
  // first check if name is taken
  if (!db.checkAvailable(name)) {
    return "Error: Name Unavailable";
  }

  return { name, tokenId, signature };
});

const start = async () => {
  try {
    await app.listen({ port: 8083 });
    app.log.info(`Server is listening on ${app.server?.address().port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
