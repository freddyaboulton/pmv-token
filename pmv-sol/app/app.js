import express from 'express';
import {initialize} from './helpers.js';
import {mintToken} from './claim.js';

const app = express();
const port = 3000;

app.use(express.urlencoded({extended: true}));


await initialize();

app.get('/', function(req, res) {
  res.send('Hello World!');
});

app.post('/claim/:tokenIndex', function(req, res) {
  console.log(req.body.solAddress);
  const tx = mintToken(req.body.solAddress, req.params.tokenIndex);
  res.send(tx);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
