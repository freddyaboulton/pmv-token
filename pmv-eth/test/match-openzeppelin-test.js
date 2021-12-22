
const {
  shouldBehaveLikeERC721,
  shouldBehaveLikeERC721Metadata,
  shouldBehaveLikeERC721Enumerable,
} = require('./ERC721.behavior');

// const {ethers} = require('hardhat');
// const {MerkleTree} = require('merkletreejs');
// const keccak256 = require('keccak256');


const ERC721Mock = artifacts.require('ERC721EnumerableMock');


contract('ERC721Optimized', function(accounts) {
  const name = 'PMV';
  const symbol = 'PMVTKN';

  beforeEach(async function() {
    // const PMVOptimized = await ethers.getContractFactory('PMVOptimized');

    // [owner, addr1, addr2, addr3,
    //   addr5, addr6, addr7] = accounts;

    // const merkleEntries = [[owner.address, 2],
    //   [addr1.address, 2],
    //   [addr2.address, 2],
    //   [addr3.address, 3]];


    // const hashes = merkleEntries.map((entry) => hashToken(...entry));
    // validTree = new MerkleTree(hashes, keccak256, {sortPairs: true});
    // const root = validTree.getHexRoot();
    // pmv = await PMVOptimized.connect(owner).deploy(root, 'https://not-real-uri.com/');
    // await pmv.deployed();
    // await pmv.setSale(true);
    this.token = await ERC721Mock.new(name, symbol);
  });

  shouldBehaveLikeERC721('ERC721', ...accounts);
  shouldBehaveLikeERC721Metadata('ERC721', name, symbol, ...accounts);
  shouldBehaveLikeERC721Enumerable('ERC721', ...accounts);
});
