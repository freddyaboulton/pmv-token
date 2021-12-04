import express from 'express';
import {initialize, pmv} from './helpers.js';
import {mintToken} from './claim.js';
import {verify} from './verify.js';
import {ethers} from 'ethers';

const app = express();
app.use(express.json());
const port = 3000;

app.use(express.urlencoded({extended: true}));


await initialize();

app.get('/', function(req, res) {
  res.send('Hello World!');
});

app.post('/claim/:tokenIndex', async function(req, res) {
  let isOk = false;

  let isOwner;
  let isVerified;
  let isApproved;

  if (ethers.utils.isAddress(req.body.ethAddress)) {
    const ownerOfToken = await pmv.ownerOf(req.params.tokenIndex);
    const sanitizedAddress = ethers.utils.getAddress(req.body.ethAddress);
    isOwner = ownerOfToken === sanitizedAddress;
    isVerified = verify(req.body.signature, req.body.ethAddress);
    isApproved = isVerified && isOwner;
  } else {
    isOwner = false;
    isVerified = false;
    isApproved = false;
  }

  if (isApproved) {
    try {
      await mintToken(req.body.solAddress, req.params.tokenIndex);
      isOk = true;
    } catch (e) {
    }
  }

  res.send({'ok': isOk, 'isVerified': isVerified,
    'isOwner': isOwner, 'isApproved': isApproved});
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
