// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./ERC721Optimized.sol";

/**
 * @title ERC721Mock
 * This mock just provides a public safeMint, mint, and burn functions for testing purposes
 * The mint method follows the logic of the PMV mint function so this contract should behave
 */
contract ERC721EnumerableMock is ERC721Optimized {
    string private _baseTokenURI;

    constructor(string memory name, string memory symbol) ERC721Optimized(name, symbol) {}

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string calldata newBaseTokenURI) public {
        _baseTokenURI = newBaseTokenURI;
    }

    function baseURI() public view returns (string memory) {
        return _baseURI();
    }

    function exists(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    function mint(uint256 quantity) public {
        for(uint256 i = 0; i < quantity; i++) {
            _safeMint(msg.sender, totalNonBurnedSupply() + 1);
        }
    }

    function burn(uint256 tokenId) public {
        _burn(tokenId);
    }
}