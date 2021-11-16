const { expect } = require("chai");
const { ethers } = require("hardhat");
//const { MerkleTree } = require('./merkleTree.js');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');


describe("PMV", function () {
  it("Should return the total supply", async function () {
    const PMV = await ethers.getContractFactory("PMV");

    const [owner, addr1, addr2, addr3] = await ethers.getSigners();


    let elements = [await owner.getAddress(), await addr1.getAddress(), await addr2.getAddress(), await addr3.getAddress()];
    elements = elements.map(el => Buffer.from(el, "utf-8"));
    const merkleTree = new MerkleTree(elements);
    const root = merkleTree.getHexRoot();

    const pmv = await PMV.deploy(root);
    await pmv.deployed();

    expect(await pmv.TOTAL_SUPPLY()).to.equal(10);
  });

  it("Should let accounts on whitelist mint", async function () {
    const PMV = await ethers.getContractFactory("PMV");

    const [owner, addr1, addr2, addr3] = await ethers.getSigners();


    const merkleEntries = [[await owner.getAddress(), 1],
                           [await addr1.getAddress(), 1],
                           [await addr2.getAddress(), 1],
                           [await addr3.getAddress(), 1]];

    const hashToken = (account, quantity) => {
      return Buffer.from(ethers.utils.solidityKeccak256(['address', 'uint256'], [account, quantity]).slice(2), 'hex')
    }

    const merkleTree = new MerkleTree(merkleEntries.map(token => hashToken(...token)), keccak256, { sortPairs: true })

    const root = merkleTree.getHexRoot();
    console.log(root);
    const pmv = await PMV.connect(owner).deploy(root);
    await pmv.deployed();
    console.log(await pmv.root());

    const proof = merkleTree.getHexProof(merkleEntries.map(token => hashToken(...token))[1]);
    console.log(proof);
    await pmv.connect(addr1).mint(1, proof);

  });



});
