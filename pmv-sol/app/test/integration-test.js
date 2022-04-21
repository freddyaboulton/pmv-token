import {expect} from 'chai';
import {makeMessage} from '../verify.js';
import {personalSign} from '@metamask/eth-sig-util';
import axios from 'axios';
import * as metaplex from '@metaplex/js';
import * as web3 from '@solana/web3.js';

axios.defaults.validateStatus = function() {
  return true;
};


describe('server-verify', function() {
  let publicKey1;
  let privateKey1;
  let publicKey2;
  let privateKey2;
  let publicKey3;
  let privateKey3;
  let publicKey4;
  let privateKey4;

  beforeEach(async function() {
    publicKey1 = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
    privateKey1 = Buffer.from(
        'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        'hex');

    publicKey2 = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
    privateKey2 = Buffer.from(
        '59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
        'hex');

    publicKey3 = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc';
    privateKey3 = Buffer.from(
        '5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
        'hex');

    publicKey4 = '0x90f79bf6eb2c4f870365e785982e1f101e93b906';
    privateKey4 = Buffer.from(
        '7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
        'hex');
  });

  it('Should correctly verify KeyPair1', async function() {
    const signature = personalSign(
        {privateKey: privateKey1,
          data: makeMessage()});
    const solAddress = '9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9';
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: solAddress,
      ethAddress: publicKey1,
      signature: signature,
      tokenIndex: 12},
    );
    expect(res.status).to.equal(200);
    expect(res.data.isVerified).to.be.true;
    expect(res.data.isOwner).to.be.true;
    expect(res.data.isApproved).to.be.true;

    const verifiedRes = await axios.get('http://localhost:3000/claim/12');
    expect(verifiedRes.data.isClaimed).to.be.true;
    expect(verifiedRes.data.ethAddress).to.equal(publicKey1);
    expect(verifiedRes.data.solAddress).to.equal(solAddress);
  });

  it('Should correctly verify checksummed KeyPair1', async function() {
    const signature = personalSign(
        {privateKey: privateKey1,
          data: makeMessage()});
    const ethAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const solAddress = '9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9';
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: solAddress,
      ethAddress: ethAddress,
      signature: signature,
      tokenIndex: 13},
    );
    expect(res.status).to.equal(200);
    expect(res.data.isVerified).to.be.true;
    expect(res.data.isOwner).to.be.true;
    expect(res.data.isApproved).to.be.true;
    expect(res.data.mintAddress).to.not.be.undefined;
    expect(res.data.transaction).to.not.be.undefined;

    const verifiedRes = await axios.get('http://localhost:3000/claim/13');
    expect(verifiedRes.data.isClaimed).to.be.true;
    expect(verifiedRes.data.ethAddress).to.equal(ethAddress);
    expect(verifiedRes.data.solAddress).to.equal(solAddress);
  });

  it('Should correctly verify KeyPair2', async function() {
    const signature = personalSign(
        {privateKey: privateKey2,
          data: makeMessage()});
    const solAddress = '9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9';
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: solAddress,
      ethAddress: publicKey2,
      signature: signature,
      tokenIndex: 7,
    });
    expect(res.status).to.equal(200);
    expect(res.data.isVerified).to.be.true;
    expect(res.data.isOwner).to.be.true;
    expect(res.data.isApproved).to.be.true;
    expect(res.data.mintAddress).to.not.be.undefined;
    expect(res.data.transaction).to.not.be.undefined;

    const verifiedRes = await axios.get('http://localhost:3000/claim/7');
    expect(verifiedRes.data.isClaimed).to.be.true;
    expect(verifiedRes.data.ethAddress).to.equal(publicKey2);
    expect(verifiedRes.data.solAddress).to.equal(solAddress);
  });

  it('Should correctly verify KeyPair3', async function() {
    const signature = personalSign(
        {privateKey: privateKey3,
          data: makeMessage()});
    const solAddress = '5Vi79ysmRBFe6dnfHmErH6VJnWQXeWZio7JKaHQWkmH5';
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: solAddress,
      ethAddress: publicKey3,
      signature: signature,
      tokenIndex: 2,
    });
    expect(res.status).to.equal(200);
    expect(res.data.isVerified).to.be.true;
    expect(res.data.isOwner).to.be.true;
    expect(res.data.isApproved).to.be.true;
    expect(res.data.mintAddress).to.not.be.undefined;
    const connection = new web3.Connection(
        web3.clusterApiUrl('devnet'),
        'recent',
    );
    const metadataPDA = await metaplex.programs.metadata.Metadata.getPDA(
        res.data.mintAddress,
    );
    const mintAccInfo = await connection.getAccountInfo(
        metadataPDA);
    const metadata = metaplex.programs.metadata.Metadata.from(
        new metaplex.Account(res.data.mintAddress, mintAccInfo),
    );
    expect(metadata.data.isMutable).to.equal(0);
    expect(res.data.transaction).to.not.be.undefined;

    const verifiedRes = await axios.get('http://localhost:3000/claim/2');
    expect(verifiedRes.data.isClaimed).to.be.true;
    expect(verifiedRes.data.ethAddress).to.equal(publicKey3);
    expect(verifiedRes.data.solAddress).to.equal(solAddress);
  });

  it('Should correctly verify KeyPair4', async function() {
    const signature = personalSign(
        {privateKey: privateKey4,
          data: makeMessage()});
    const solAddress = '9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9';
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: solAddress,
      ethAddress: publicKey4,
      signature: signature,
      tokenIndex: 21,
    });
    expect(res.status).to.equal(200);
    expect(res.data.isVerified).to.be.true;
    expect(res.data.isOwner).to.be.true;
    expect(res.data.isApproved).to.be.true;
    expect(res.data.mintAddress).to.not.be.undefined;
    expect(res.data.transaction).to.not.be.undefined;

    const verifiedRes = await axios.get('http://localhost:3000/claim/21');
    expect(verifiedRes.data.isClaimed).to.be.true;
    expect(verifiedRes.data.ethAddress).to.equal(publicKey4);
    expect(verifiedRes.data.solAddress).to.equal(solAddress);
  });

  it(`Should correctly get tokens owned by
    9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9`,
  async function() {
    const solAddress = '9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9';
    const res = await axios.get(`http://localhost:3000/ownership/${solAddress}`);
    const tokenNames = res.data.tokens.map((t) => t.data.name);
    expect(tokenNames.length).to.equal(4);
    expect(tokenNames.includes('PMV 21')).to.be.true;
    expect(tokenNames.includes('PMV 7')).to.be.true;
    expect(tokenNames.includes('PMV 12')).to.be.true;
    expect(tokenNames.includes('PMV 13')).to.be.true;
  });

  it(`Should correctly get tokens owned by
  5Vi79ysmRBFe6dnfHmErH6VJnWQXeWZio7JKaHQWkmH5`,
  async function() {
    const solAddress = '5Vi79ysmRBFe6dnfHmErH6VJnWQXeWZio7JKaHQWkmH5';
    const res = await axios.get(`http://localhost:3000/ownership/${solAddress}`);
    const tokenNames = res.data.tokens.map((t) => t.data.name);
    expect(tokenNames.length).to.equal(1);
    expect(tokenNames.includes('PMV 2')).to.be.true;
  });

  it(`Should return empty array for address with no NFTs`,
      async function() {
        const solAddress = 'C5XKmqgXb3WxxFFDUfrBL9igiz6d2TMqroSyAWwtGVS6';
        const res = await axios.get(`http://localhost:3000/ownership/${solAddress}`);
        expect(res.data.tokens).to.have.lengthOf(0);
      });

  it('Should not verify publicKey1 with privateKey2', async function() {
    const signature = personalSign(
        {privateKey: privateKey2,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '5Vi79ysmRBFe6dnfHmErH6VJnWQXeWZio7JKaHQWkmH5',
      ethAddress: publicKey1,
      signature: signature,
      tokenIndex: 12,
    });
    expect(res.status).to.equal(403);
    expect(res.data.errors[0].msg).to.equal('Account not authorized to claim');
    expect(res.data.errors[0].isVerified).to.be.false;
    expect(res.data.errors[0].isOwner).to.be.true;
    expect(res.data.errors[0].isApproved).to.be.false;
  });

  it('Should not verify publicKey3 for token index 14', async function() {
    const signature = personalSign(
        {privateKey: privateKey3,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '5Vi79ysmRBFe6dnfHmErH6VJnWQXeWZio7JKaHQWkmH5',
      ethAddress: publicKey3,
      signature: signature,
      tokenIndex: 15,
    });
    expect(res.status).to.equal(403);
    expect(res.data.errors[0].msg).to.equal('Account not authorized to claim');
    expect(res.data.errors[0].isVerified).to.be.true;
    expect(res.data.errors[0].isOwner).to.be.false;
    expect(res.data.errors[0].isApproved).to.be.false;
  });

  it('Should not verify invalid EthAddresses', async function() {
    const signature = personalSign(
        {privateKey: privateKey3,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '5Vi79ysmRBFe6dnfHmErH6VJnWQXeWZio7JKaHQWkmH5',
      ethAddress: 'fooAddress',
      signature: signature,
      tokenIndex: 15,
    });
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    expect(res.data.errors[0].msg).to.equal('Invalid Eth Address');
  });

  it('Should not verify invalid EthAddresses 2', async function() {
    const signature = personalSign(
        {privateKey: privateKey3,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '5Vi79ysmRBFe6dnfHmErH6VJnWQXeWZio7JKaHQWkmH5',
      ethAddress: 5,
      signature: signature,
      tokenIndex: 15,
    });
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    expect(res.data.errors[0].msg).to.equal('Invalid Eth Address');
  });

  it('Should not verify invalid solAddress', async function() {
    const signature = personalSign(
        {privateKey: privateKey3,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: 'foo-Address',
      ethAddress: publicKey3,
      signature: signature,
      tokenIndex: 15,
    });
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    expect(res.data.errors[0].msg).to.equal('Invalid Sol Address');
  });

  it('Should not verify invalid solAddress 2', async function() {
    const signature = personalSign(
        {privateKey: privateKey3,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: publicKey3,
      ethAddress: publicKey3,
      signature: signature,
      tokenIndex: 15,
    });
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    expect(res.data.errors[0].msg).to.equal('Invalid Sol Address');
  });

  it('Should not verify invalid solAddress 3', async function() {
    const signature = personalSign(
        {privateKey: privateKey3,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '0x5faaf2315678afecb367f032d93f642f64180aa3',
      ethAddress: publicKey3,
      signature: signature,
      tokenIndex: 15,
    });
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    expect(res.data.errors[0].msg).to.equal('Invalid Sol Address');
  });

  it('Should not verify negative tokenIndex', async function() {
    const signature = personalSign(
        {privateKey: privateKey3,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9',
      ethAddress: publicKey3,
      signature: signature,
      tokenIndex: -1,
    });
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    expect(res.data.errors[0].msg).to.equal('Invalid Token Index');
  });

  it('Should not verify tokenIndex not minted', async function() {
    const signature = personalSign(
        {privateKey: privateKey3,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9',
      ethAddress: publicKey3,
      signature: signature,
      tokenIndex: 22,
    });
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    const msg = '22 has not been minted yet.';
    expect(res.data.errors[0].msg).to.equal(msg);
  });

  it('Should not verify tokenIndex not minted 50', async function() {
    const signature = personalSign(
        {privateKey: privateKey3,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9',
      ethAddress: publicKey3,
      signature: signature,
      tokenIndex: 50,
    });
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    const msg = '50 has not been minted yet.';
    expect(res.data.errors[0].msg).to.equal(msg);
  });

  it('Should not verify zero tokenIndex', async function() {
    const signature = personalSign(
        {privateKey: privateKey3,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9',
      ethAddress: publicKey3,
      signature: signature,
      tokenIndex: 0,
    });
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    expect(res.data.errors[0].msg).to.equal('Invalid Token Index');
  });

  it('Should not verify tokenIndex too large', async function() {
    const signature = personalSign(
        {privateKey: privateKey3,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9',
      ethAddress: publicKey3,
      signature: signature,
      tokenIndex: 10001,
    });
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    expect(res.data.errors[0].msg).to.equal('Invalid Token Index');
  });

  it('Should not verify float tokenIndex', async function() {
    const signature = personalSign(
        {privateKey: privateKey3,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9',
      ethAddress: publicKey3,
      signature: signature,
      tokenIndex: 3.14,
    });
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    expect(res.data.errors[0].msg).to.equal('Invalid Token Index');
  });

  it('Should not verify negative tokenIndex for get', async function() {
    const res = await axios.get('http://localhost:3000/claim/-1');
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    expect(res.data.errors[0].msg).to.equal('Invalid Token Index');
  });

  it('Should not verify zero tokenIndex for get', async function() {
    const res = await axios.get('http://localhost:3000/claim/0');
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    expect(res.data.errors[0].msg).to.equal('Invalid Token Index');
  });

  it('Should not verify tokenIndex > 10,000 for get', async function() {
    const res = await axios.get('http://localhost:3000/claim/10001');
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    expect(res.data.errors[0].msg).to.equal('Invalid Token Index');
  });

  it('Should not verify float tokenIndex for get', async function() {
    const res = await axios.get('http://localhost:3000/claim/3.14');
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    expect(res.data.errors[0].msg).to.equal('Invalid Token Index');
  });

  it('Should correctly display tokenIndex that has not been claimed',
      async function() {
        const res = await axios.get('http://localhost:3000/claim/22');
        expect(res.data.isClaimed).to.be.false;
        expect(res.data.ethAddress).to.equal('');
        expect(res.data.solAddress).to.equal('');
      });

  it('Should not verify invalid solAddress ownership', async function() {
    const address = '0x5faaf2315678afecb367f032d93f642f64180aa3';
    const res = await axios.get(
        `http://localhost:3000/ownership/${address}`);
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    expect(res.data.errors[0].msg).to.equal('Invalid Sol Address');
  });
});
