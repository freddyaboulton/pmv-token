import express from 'express';
import { initialize } from './helpers.js';
import { mintToken } from './claim.js';

const app = express()
const port = 3000

await initialize();

app.get("/", function (req, res) {
    res.send('Hello World!');
})

app.get('/claim/:solAddress/:tokenIndex', function (req, res) {
    const tx = mintToken(req.params.solAddress, req.params.tokenIndex);
    res.send(tx);
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})