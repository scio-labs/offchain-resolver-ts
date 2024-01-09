import { makeApp } from './server';
import { ethers } from 'ethers';
import cors from 'cors';
import { PRIVATE_KEY, DATABASE_CONNECTION, PORT, TTL } from "./constants";

const address = ethers.utils.computeAddress(<string>PRIVATE_KEY);
const signer = new ethers.utils.SigningKey(<string>PRIVATE_KEY);

const app = makeApp(signer, '/', <string>DATABASE_CONNECTION, parseInt(<string>TTL));
app.use(cors());
console.log(`Serving on port ${PORT} with signing address ${address}`);
app.listen(parseInt(<string>PORT));

module.exports = app;
