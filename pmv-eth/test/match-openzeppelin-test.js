
const {
  shouldBehaveLikeERC721,
  shouldBehaveLikeERC721Metadata,
  shouldBehaveLikeERC721Enumerable,
} = require('./ERC721.behavior');


const ERC721Mock = artifacts.require('ERC721EnumerableMock');


contract('ERC721Optimized', function(accounts) {
  const name = 'PMV';
  const symbol = 'PMVTKN';

  beforeEach(async function() {
    this.token = await ERC721Mock.new(name, symbol);
  });

  shouldBehaveLikeERC721('ERC721', ...accounts);
  shouldBehaveLikeERC721Metadata('ERC721', name, symbol, ...accounts);
  shouldBehaveLikeERC721Enumerable('ERC721', ...accounts);
});
