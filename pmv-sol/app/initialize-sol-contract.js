import {initialize} from './helpers.js';
import {createRequire} from 'module';
const require = createRequire(import.meta.url);

const anchor = require('@project-serum/anchor');
const fs = require('fs');

const configKeyPair = anchor.web3.Keypair.generate();
const uuid = anchor.web3.Keypair.generate().
    publicKey.toBase58().slice(0, 6);

await initialize(configKeyPair, uuid);

fs.writeFileSync('./latest_uuid.txt', uuid);
fs.writeFileSync('./latest_config_public_key.txt',
    configKeyPair.publicKey.toString());
