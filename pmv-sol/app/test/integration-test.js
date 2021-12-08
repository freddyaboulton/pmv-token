import {expect} from 'chai';
import {makeMessage} from '../verify.js';
import {personalSign} from '@metamask/eth-sig-util';
import axios from 'axios';


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
          data: makeMessage(publicKey1)});
    const res = await axios.post('http://localhost:3000/claim/1', {
      solAddress: '5Vi79ysmRBFe6dnfHmErH6VJnWQXeWZio7JKaHQWkmH5',
      ethAddress: publicKey1,
      signature: signature,
    });
    expect(res.data.ok).to.be.true;
    expect(res.data.isVerified).to.be.true;
  });

  it('Should correctly verify KeyPair2', async function() {
    const signature = personalSign(
        {privateKey: privateKey2,
          data: makeMessage(publicKey2)});
    const res = await axios.post('http://localhost:3000/claim/2', {
      solAddress: '5Vi79ysmRBFe6dnfHmErH6VJnWQXeWZio7JKaHQWkmH5',
      ethAddress: publicKey2,
      signature: signature,
    });
    expect(res.data.ok).to.be.true;
    expect(res.data.isVerified).to.be.true;
  });

  it('Should correctly verify KeyPair3', async function() {
    const signature = personalSign(
        {privateKey: privateKey3,
          data: makeMessage(publicKey3)});
    const res = await axios.post('http://localhost:3000/claim/3', {
      solAddress: '5Vi79ysmRBFe6dnfHmErH6VJnWQXeWZio7JKaHQWkmH5',
      ethAddress: publicKey3,
      signature: signature,
    });
    expect(res.data.ok).to.be.true;
    expect(res.data.isVerified).to.be.true;
  });

  it('Should correctly verify KeyPair4', async function() {
    const signature = personalSign(
        {privateKey: privateKey4,
          data: makeMessage(publicKey4)});
    const res = await axios.post('http://localhost:3000/claim/4', {
      solAddress: '5Vi79ysmRBFe6dnfHmErH6VJnWQXeWZio7JKaHQWkmH5',
      ethAddress: publicKey4,
      signature: signature,
    });
    expect(res.data.ok).to.be.true;
    expect(res.data.isVerified).to.be.true;
  });

  it('Should not verify publicKey1 with privateKey2', async function() {
    const signature = personalSign(
        {privateKey: privateKey2,
          data: makeMessage(publicKey2)});
    const res = await axios.post('http://localhost:3000/claim/4', {
      solAddress: '5Vi79ysmRBFe6dnfHmErH6VJnWQXeWZio7JKaHQWkmH5',
      ethAddress: publicKey1,
      signature: signature,
    });
    expect(res.data.ok).to.be.false;
    expect(res.data.isVerified).to.be.false;
  });
});
