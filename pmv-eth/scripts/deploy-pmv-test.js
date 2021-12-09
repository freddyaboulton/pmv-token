// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
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


async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const PMV = await ethers.getContractFactory('PMV');

  const [deployer] = await ethers.getSigners();

  // Construct merkle tree here
  const merkleEntries = [['0xE4763c199bdD01aa01c5dc4e9524c63F307e9021', 2],
  ['0x7b1C4134a8682dbee5AF7993DEc9745e11263E8f', 20],
  ['0x537a638751D3602c0fd0843272E958C78aAc2D8B', 3],
  ['0x9De6405C0C7512ee94BCB79B860668a52aa7FAd2', 1],
  [deployer.address, 1]];
  
  const hashes = merkleEntries.map((token) => hashToken(...token));
  validTree = new MerkleTree(hashes, keccak256, {sortPairs: true});
  const root = validTree.getHexRoot();
  console.log("Deploying contracts with the account:", deployer.address);

  const pmv = await PMV.connect(deployer).deploy(root, 'https://my-json-server.typicode.com/freddyaboulton/pmv-token/tokens/');

  console.log('PMV deployed to:', pmv.address);

  await pmv.connect(deployer).setPresale(true);
  const preSaleStatus = await pmv.connect(deployer).presaleActive();
  console.log('Presale status ', preSaleStatus)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
