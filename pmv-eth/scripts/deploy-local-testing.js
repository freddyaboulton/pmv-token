const hre = require('hardhat'); // eslint-disable-line no-unused-vars
const {ethers} = require('hardhat');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');

/**
 * Hash tokens for merkle tree construction.
 * @param {string} account - Address.
 * @param {int} quantity - Max allowed to mint.
 * @return {buffer} keccak256 hash.
 */
function hashToken(account, quantity) {
  const hash = ethers.utils.solidityKeccak256(['address', 'uint256'],
      [account, quantity]).slice(2);
  return Buffer.from(hash, 'hex');
}

/**
 * Deploy the contract on the local hardhat network
 */
async function main() {
  const PMV = await ethers.getContractFactory('PMVOptimized');

  const [deployer, addr2, addr3, addr4] = await ethers.getSigners();

  // Construct merkle tree here
  const merkleEntries = [[deployer.address, 2],
    [addr2.address, 2],
    [addr3.address, 2]];

  console.log(deployer.address);
  console.log(addr2.address);

  const hashes = merkleEntries.map((token) => hashToken(...token));
  validTree = new MerkleTree(hashes, keccak256, {sortPairs: true});
  const root = validTree.getHexRoot();
  console.log('Deploying contracts with the account:', deployer.address);

  const pmv = await PMV.connect(deployer).deploy(root,
      'https://my-json-server.typicode.com/freddyaboulton/pmv-token/tokens/');

  console.log('PMV deployed to:', pmv.address);

  await pmv.connect(deployer).setSale(true);

  await pmv.connect(addr3).mint(5, {
    value: ethers.BigNumber.from('2000000000000000000'),
  });

  await pmv.connect(addr2).mint(5, {
    value: ethers.BigNumber.from('2000000000000000000'),
  });

  await pmv.connect(deployer).mint(5, {
    value: ethers.BigNumber.from('200000000000000000'),
  });

  await pmv.connect(addr4).mint(5, {
    value: ethers.BigNumber.from('200000000000000000'),
  });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
