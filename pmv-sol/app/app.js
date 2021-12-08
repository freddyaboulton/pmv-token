import express from 'express';
import {initialize} from './helpers.js';
import {mintToken} from './claim.js';
import {verify} from './verify.js';

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
  console.log(req.body);
  const isVerified = verify(req.body.signature, req.body.ethAddress);
  if (isVerified) {
    try {
      await mintToken(req.body.solAddress, req.params.tokenIndex);
      isOk = true;
    } catch (e) {
    }
  }
  res.send({'ok': isOk, 'isVerified': isVerified});
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
