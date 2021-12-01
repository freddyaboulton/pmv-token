// contracts/PMV.sol
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";


contract PMV is ERC721Enumerable, Ownable {
    using Strings for uint256;
    using MerkleProof for bytes32[];

    uint256 public constant maxSupply = 30;
    uint256 public constant maxPerWallet = 10;
    uint public constant salePrice = 0.02 ether;
    bytes32 public root;
    bool public presaleActive = false; 
    bool public saleActive = false;
    mapping (address => uint256) private presaleMints;
    mapping (address => uint256) private mints;    
    string private tokenBaseURI;
    string private notRevealedUri;
    bool private revealed = false;

    constructor(bytes32 merkleroot, string memory uri) ERC721("PMV", "PMVTKN") {
        root = merkleroot;
        notRevealedUri = uri;
     }
    
    function mintPresale(uint256 allowance, bytes32[] calldata proof, uint256 tokenQuantity) external payable {
        require(presaleActive, "PRESALE NOT ACTIVE");
        require(!saleActive, "SALE ACTIVE RIGHT NOW");
        require(proof.verify(root, keccak256(abi.encodePacked(msg.sender, allowance))), "NOT ON WHITELIST");
        require(presaleMints[msg.sender] + tokenQuantity <= allowance, "MINTING MORE THAN ALLOWED");
        require(tokenQuantity * salePrice == msg.value, "INCORRECT PAYMENT AMOUNT");
        
        for(uint256 i = 0; i < tokenQuantity; i++) {
            _safeMint(msg.sender, totalSupply() + 1);
        }  
        
        presaleMints[msg.sender] += tokenQuantity;      
    }

    function mint(uint256 tokenQuantity) external payable {
        require(saleActive, "SALE NOT ACTIVE");
        require(!presaleActive, "PRESALE ONLY RIGHT NOW");
        require(mints[msg.sender] + tokenQuantity <= maxPerWallet, "MINTING MORE THAN ALLOWED");
        require(tokenQuantity + totalSupply() <= maxSupply, "NOT ENOUGH LEFT IN STOCK");
        require(tokenQuantity * salePrice <= msg.value, "INCORRECT PAYMENT AMOUNT");

        for(uint256 i = 0; i < tokenQuantity; i++) {
            _safeMint(msg.sender, totalSupply() + 1);
        }

        mints[msg.sender] += tokenQuantity;

    }
    
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");

        if(revealed == false) {
            return notRevealedUri;
        }

        else {
            return string(abi.encodePacked(tokenBaseURI, tokenId.toString()));
        }        
    } 

    function setPresale(bool _presaleStatus) external onlyOwner {
        presaleActive = _presaleStatus;
    }

    function setSale(bool _saleStatus) external onlyOwner {
        saleActive = _saleStatus;
    }

    function setURIStatus(bool _revealed, string calldata _tokenBaseURI) external onlyOwner {
        require(bytes(_tokenBaseURI).length > 0, "_tokenBaseURI is empty");
        revealed = _revealed;
        tokenBaseURI = _tokenBaseURI;
    }

    function setRoot(bytes32 _root) external onlyOwner {
        require(_root.length > 0, "_root is empty");
        root = _root;
    }

}
