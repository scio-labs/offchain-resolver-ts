import fastify from 'fastify';
import { Command } from 'commander';
import { ethers } from 'ethers';
import { JSONDatabase } from './json';

const program = new Command();
program
  .requiredOption(
    '-k --private-key <key>',
    'Private key to sign responses with. Prefix with @ to read from a file'
  )
  .requiredOption('-d --data <file>', 'JSON file to read data from')
program.parse(process.argv);
const options = program.opts();
let privateKey = options.privateKey;

const address = ethers.utils.computeAddress(privateKey);
const signer = new ethers.utils.SigningKey(privateKey);
const db = JSONDatabase.fromFilename(options.data, parseInt(options.ttl));

const app = fastify();

app.get('/', async () => {
  return 'hello world';
});

app.get('/:name/:tokenId/:signature', async (request, reply) => {
  const { name, tokenId, signature } = request.params;
  // first check if name is taken
  if (!db.checkAvailable(name)) {
    return "Error: Name Unavilable";
  }
  
  return { param1, param2, param3 };
});

const start = async () => {
  try {
    await app.listen({ port: 8083 });
    app.log.info(`Server is listening on ${app.server.address().port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();