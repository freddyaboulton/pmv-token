import express from 'express';
import {initialize, pmv} from './helpers.js';
import {mintToken} from './claim.js';
import {verify} from './verify.js';
import {isValidSolAddress, isValidEthAddress} from './validators.js';
import {body, validationResult} from 'express-validator';
import {ethers} from 'ethers';


const app = express();
app.use(express.json());
const port = 3000;

app.use(express.urlencoded({extended: true}));


await initialize();

app.get('/', function(req, res) {
  res.send('Hello World!');
});

app.post('/claim',
    body('tokenIndex').isInt({lt: 10001, gt: 0})
        .withMessage('Invalid Token Index'),
    body('solAddress').custom(isValidSolAddress),
    body('ethAddress').custom(isValidEthAddress),
    async function(req, res) {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({errors: errors.array()});
      }

      let status;
      let response;

      const ownerOfToken = ethers.utils.getAddress(
          await pmv.ownerOf(req.body.tokenIndex));
      const sanitizedAddress = ethers.utils.getAddress(req.body.ethAddress);
      const isOwner = ownerOfToken === sanitizedAddress;
      const isVerified = verify(req.body.signature, sanitizedAddress);
      const isApproved = isVerified && isOwner;

      if (isApproved) {
        try {
          await mintToken(req.body.solAddress, req.body.tokenIndex);
          status = 200;
          response = {'isVerified': isVerified, 'isOwner': isOwner,
            'isApproved': isApproved};
        } catch (e) {
          status = 400;
          response = {errors: [{'msg': 'Problem encountered during mint'}]};
        }
      } else {
        status = 403;
        response = {errors: [
          {'msg': 'Account not authorized to claim',
            'isVerified': isVerified, 'isOwner': isOwner,
            'isApproved': isApproved}]};
      }

      res.status(status).json(response);
    });

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
