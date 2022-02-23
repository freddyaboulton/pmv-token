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
  const PMV = await ethers.getContractFactory('PMV');

  // taken from: https://docs.chain.link/docs/vrf-contracts/v1/
  const linkToken = '0x01BE23585060835E02B77ef475b0Cc51aA1e0709';
  const vrfCoordinator = '0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B';
  const keyHash =
    '0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311';
  const linkFee = ethers.BigNumber.from('100000000000000000');

  // dummy provenance hash
  const provenanceHash =
    '0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc';

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
      'https://my-json-server.typicode.com/freddyaboulton/pmv-token/tokens/', root,
      provenanceHash, vrfCoordinator, linkToken, keyHash, linkFee);

  console.log('PMV deployed to:', pmv.address);

  await pmv.connect(deployer).setSale(true);

  await pmv.connect(addr3).mint(5, {
    value: ethers.BigNumber.from('10000000000000000000'),
  });

  await pmv.connect(addr2).mint(5, {
    value: ethers.BigNumber.from('10000000000000000000'),
  });

  await pmv.connect(deployer).mint(5, {
    value: ethers.BigNumber.from('1000000000000000000'),
  });

  await pmv.connect(addr4).mint(5, {
    value: ethers.BigNumber.from('1000000000000000000'),
  });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
