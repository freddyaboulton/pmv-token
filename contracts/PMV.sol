// contracts/PirataToken.sol
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";


contract PMV is ERC721Enumerable, Ownable {
    using Strings for uint256;
    using MerkleProof for bytes32[];

    uint256 public constant TOTAL_SUPPLY = 10;
    uint public constant SALE_PRICE = 0.02 ether;
    bytes32 immutable public root;
    
    string private _tokenBaseURI = "https://my-json-server.typicode.com/freddyaboulton/pmv-token/tokens/";

    constructor(bytes32 merkleroot) ERC721("PMV", "PMVTKN") {
        root = merkleroot;
     }
    
    function mint(uint256 tokenQuantity, bytes32[] calldata proof) external payable {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, tokenQuantity));
        require(proof.verify(root, leaf), "NOT ON WHITELIST");
        require(totalSupply() < TOTAL_SUPPLY, "OUT_OF_STOCK");
        require(totalSupply() + tokenQuantity <= TOTAL_SUPPLY, "NOT_ENOUGH_IN_STOCK");
        
        for(uint256 i = 0; i < tokenQuantity; i++) {
            _safeMint(msg.sender, totalSupply() + 1);
        }        
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721) returns (string memory) {
        require(_exists(tokenId), "Cannot query non-existent token");
        
        return string(abi.encodePacked(_tokenBaseURI, tokenId.toString()));
    }

    function _verify(bytes32 leaf, bytes32[] memory proof) internal view returns (bool)
    {
        return MerkleProof.verify(proof, root, leaf);
    }

}
