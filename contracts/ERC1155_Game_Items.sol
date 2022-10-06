// SPDX-License-Identifier: Commons-Clause-1.0
//  __  __     _        ___     _
// |  \/  |___| |_ __ _| __|_ _| |__
// | |\/| / -_)  _/ _` | _/ _` | '_ \
// |_|  |_\___|\__\__,_|_|\__,_|_.__/
//
// Launch your crypto game or gamefi project's blockchain
// infrastructure & game APIs fast with https://trymetafab.com

pragma solidity ^0.8.16;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./common/ERC2771Context_Upgradeable.sol";

contract ERC1155_Game_Items is ERC1155, ERC2771Context_Upgradeable, AccessControl {
  using Strings for uint256;

  mapping(uint256 => string) public itemURIs;
  mapping(uint256 => uint256) public itemTransferTimelocks; // itemId => timestamp, 0 timestamp = never transferrable.

  bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 private constant OWNER_ROLE = keccak256("OWNER_ROLE");

  constructor(address _forwarder)
  ERC1155("")
  ERC2771Context_Upgradeable(_forwarder) {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(OWNER_ROLE, _msgSender());
  }

  function uri(uint256 _itemId) public view override returns (string memory) {
    return itemURIs[_itemId];
  }

  function setItemURI(uint256 _itemId, string memory _uri) external onlyRole(OWNER_ROLE) {
    itemURIs[_itemId] = _uri;
  }

  function bulkSetItemURIs(uint256[] calldata _itemIds, string[] memory _uris) external onlyRole(OWNER_ROLE) {
    for (uint256 i = 0; i < _itemIds.length; i++) {
      itemURIs[_itemIds[i]] = _uris[i];
    }
  }

  function isItemTransferrable(uint256 _itemId) public view returns (bool) {
    return itemTransferTimelocks[_itemId] < block.timestamp;
  }

  function setItemTransferTimelock(uint256 _itemId, uint256 _unlockTimestamp) external onlyRole(OWNER_ROLE) {
    itemTransferTimelocks[_itemId] = _unlockTimestamp;
  }

  function mintToAddress(address _toAddress, uint256 _itemId, uint256 _quantity) external canMint {
    _mint(_toAddress, _itemId, _quantity, "");
  }

  function mintBatchToAddress(address _toAddress, uint256[] calldata _itemIds, uint256[] calldata _quantities) external canMint {
    _mintBatch(_toAddress, _itemIds, _quantities, "");
  }

  function burnFromAddress(address _fromAddress, uint256 _itemId, uint256 _quantity) external canBurn(_fromAddress) {
    _burn(_fromAddress, _itemId, _quantity);
  }

  function burnBatchFromAddress(address _fromAddress, uint256[] calldata _itemIds, uint256[] calldata _quantities) external canBurn(_fromAddress) {
    _burnBatch(_fromAddress, _itemIds, _quantities);
  }

  function burn(uint256 _itemId, uint256 _quantity) external {
    _burn(_msgSender(), _itemId, _quantity);
  }

  function bulkSafeTransfer(address[] calldata _toAddresses, uint256 _itemId, uint256 _quantityPerAddress) external {
    for (uint256 i = 0; i < _toAddresses.length; i++) {
      safeTransferFrom(_msgSender(), _toAddresses[i], _itemId, _quantityPerAddress, "");
    }
  }

  function bulkSafeBatchTransfer(address[] calldata _toAddresses, uint256[] calldata _itemIds, uint256[] calldata _quantitiesPerAddress) external {
    for (uint256 i = 0; i < _toAddresses.length; i++) {
      safeBatchTransferFrom(_msgSender(), _toAddresses[i], _itemIds, _quantitiesPerAddress, "");
    }
  }

  /**
   * @dev Support for gasless transactions
   */

  function upgradeTrustedForwarder(address _newTrustedForwarder) external onlyRole(OWNER_ROLE) {
    _upgradeTrustedForwarder(_newTrustedForwarder);
  }

  function _msgSender() internal view override(Context, ERC2771Context_Upgradeable) returns (address) {
    return super._msgSender();
  }

  function _msgData() internal view override(Context, ERC2771Context_Upgradeable) returns (bytes calldata) {
    return super._msgData();
  }

  /**
   * @dev Support for non-transferable items.
   */

  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal virtual override {
    for (uint256 i = 0; i < ids.length; i++) {
      require(isItemTransferrable(ids[i]), "Item is not currently transferable.");
    }

    super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }

  /**
   * @dev
   */

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  /**
   * @dev Modifiers
   */

  modifier canMint {
    require(hasRole(OWNER_ROLE, _msgSender()) || hasRole(MINTER_ROLE, _msgSender()), "Not authorized to mint.");
    _;
  }

  modifier canBurn(address _fromAddress) {
    require(_fromAddress == _msgSender() || isApprovedForAll(_fromAddress, _msgSender()), "Not approved to burn.");
    _;
  }
}
