// contracts/PMV.sol
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./ERC721Optimized.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PMVMixin is Ownable {
    using Strings for uint256;

    uint256 public constant maxSupply = 30;
    uint256 public constant maxPerWallet = 10;
    uint public constant salePrice = 0.02 ether;
    bool public presaleActive = false;
    bool public freeMintAllowed = false; 
    bool public saleActive = false;    
    string private tokenBaseURI;
    string internal notRevealedUri;
    bool private revealed = false;
    bytes32 public root;
    bytes32 public rootMintFree;

    function _tokenURI(uint256 tokenId) public view virtual returns (string memory) {

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

    function setFreeMintAllowed(bool _freeMintAllowed) external onlyOwner {
        freeMintAllowed = _freeMintAllowed;
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

    function setRootMintFree(bytes32 _root) external onlyOwner {
        require(_root.length > 0, "_root is empty");
        rootMintFree = _root;
    }

    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }
}
