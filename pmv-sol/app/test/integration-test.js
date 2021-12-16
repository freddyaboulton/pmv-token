import {expect} from 'chai';
import {makeMessage} from '../verify.js';
import {personalSign} from '@metamask/eth-sig-util';
import axios from 'axios';

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
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9',
      ethAddress: publicKey1,
      signature: signature,
      tokenIndex: 11},
    );
    expect(res.status).to.equal(200);
    expect(res.data.isVerified).to.be.true;
    expect(res.data.isOwner).to.be.true;
    expect(res.data.isApproved).to.be.true;
  });

  it('Should correctly verify checksummed KeyPair1', async function() {
    const signature = personalSign(
        {privateKey: privateKey1,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9',
      ethAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      signature: signature,
      tokenIndex: 12},
    );
    expect(res.status).to.equal(200);
    expect(res.data.isVerified).to.be.true;
    expect(res.data.isOwner).to.be.true;
    expect(res.data.isApproved).to.be.true;
    expect(res.data.mintAddress).to.not.be.undefined;
    expect(res.data.transaction).to.not.be.undefined;
  });

  it('Should correctly verify KeyPair2', async function() {
    const signature = personalSign(
        {privateKey: privateKey2,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9',
      ethAddress: publicKey2,
      signature: signature,
      tokenIndex: 6,
    });
    expect(res.status).to.equal(200);
    expect(res.data.isVerified).to.be.true;
    expect(res.data.isOwner).to.be.true;
    expect(res.data.isApproved).to.be.true;
    expect(res.data.mintAddress).to.not.be.undefined;
    expect(res.data.transaction).to.not.be.undefined;
  });

  it('Should correctly verify KeyPair3', async function() {
    const signature = personalSign(
        {privateKey: privateKey3,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '5Vi79ysmRBFe6dnfHmErH6VJnWQXeWZio7JKaHQWkmH5',
      ethAddress: publicKey3,
      signature: signature,
      tokenIndex: 1,
    });
    expect(res.status).to.equal(200);
    expect(res.data.isVerified).to.be.true;
    expect(res.data.isOwner).to.be.true;
    expect(res.data.isApproved).to.be.true;
    expect(res.data.mintAddress).to.not.be.undefined;
    expect(res.data.transaction).to.not.be.undefined;
  });

  it('Should correctly verify KeyPair4', async function() {
    const signature = personalSign(
        {privateKey: privateKey4,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '9TfBbdv2WjSvYeootcv77mcsv9Rp8dG2peP4iFJWk8V9',
      ethAddress: publicKey4,
      signature: signature,
      tokenIndex: 20,
    });
    expect(res.status).to.equal(200);
    expect(res.data.isVerified).to.be.true;
    expect(res.data.isOwner).to.be.true;
    expect(res.data.isApproved).to.be.true;
    expect(res.data.mintAddress).to.not.be.undefined;
    expect(res.data.transaction).to.not.be.undefined;
  });

  it('Should not verify publicKey1 with privateKey2', async function() {
    const signature = personalSign(
        {privateKey: privateKey2,
          data: makeMessage()});
    const res = await axios.post('http://localhost:3000/claim', {
      solAddress: '5Vi79ysmRBFe6dnfHmErH6VJnWQXeWZio7JKaHQWkmH5',
      ethAddress: publicKey1,
      signature: signature,
      tokenIndex: 11,
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
      tokenIndex: 14,
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
      tokenIndex: 14,
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
      tokenIndex: 14,
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
      tokenIndex: 14,
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
      tokenIndex: 14,
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
      tokenIndex: 14,
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
      tokenIndex: 21,
    });
    expect(res.status).to.equal(422);
    expect(res.data.errors.length).to.equal(1);
    const msg = '21 has not been minted yet.';
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
});
