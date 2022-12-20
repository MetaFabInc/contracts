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
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./IERC1155_Game_Items_Collection.sol";
import "../common/ERC2771Context_Upgradeable.sol";
import "../common/Roles.sol";
import "../common/System.sol";

contract ERC1155_Game_Items_Collection is IERC1155_Game_Items_Collection, ERC1155, ERC2771Context_Upgradeable, Roles, System, AccessControl, Ownable {
  using Strings for uint256;

  uint256[] public itemIds;
  string public itemBaseURI;
  mapping(uint256 => bool) public itemExists; // itemId => bool, has been minted at least 1 time
  mapping(uint256 => uint256) public itemSupplies; // itemId => minted item supply
  mapping(uint256 => uint256) public itemTransferTimelocks; // itemId => timestamp.
  mapping(uint256 => string) private itemURIs; // itemId => complete metadata uri

  constructor(address _forwarder, bytes32 _systemId)
  ERC1155("")
  ERC2771Context_Upgradeable(_forwarder)
  System(_systemId) {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(MANAGER_ROLE, _msgSender());
  }

  function uri(uint256 _itemId) public view override returns (string memory) {
    require(itemExists[_itemId], "URI request for non existent itemId");

    return bytes(itemBaseURI).length > 0
      ? string(abi.encodePacked(itemBaseURI, _itemId.toString()))
      : itemURIs[_itemId];
  }

  function setItemBaseURI(string memory _itemBaseURI) external {
    itemBaseURI = _itemBaseURI;
  }

  function setItemURI(uint256 _itemId, string memory _uri) external onlyRole(MANAGER_ROLE) {
    itemURIs[_itemId] = _uri;
    setItemIdExists(_itemId);
  }

  function isItemTransferrable(uint256 _itemId) public view returns (bool) {
    return itemTransferTimelocks[_itemId] < block.timestamp;
  }

  function setItemTransferTimelock(uint256 _itemId, uint256 _unlockTimestamp) external onlyRole(MANAGER_ROLE) {
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

  function bulkSafeBatchTransferFrom(address _fromAddress, address[] calldata _toAddresses, uint256[] calldata _itemIds, uint256[] calldata _quantitiesPerAddress) external {
    for (uint256 i = 0; i < _toAddresses.length; i++) {
      safeBatchTransferFrom(_fromAddress, _toAddresses[i], _itemIds, _quantitiesPerAddress, "");
    }
  }

  /**
   * @dev Data retrieval
   */

  function totalItemIds() external view returns(uint256) {
    return itemIds.length;
  }

  function allItemIds() external view returns (uint256[] memory) {
    return itemIds;
  }

  function allItemSupplies() external view returns (uint256[][] memory) {
    uint256[][] memory supplies = new uint256[][](itemIds.length);

    for (uint256 i = 0; i < itemIds.length; i++) {
      uint256[] memory itemSupply = new uint256[](2);

      itemSupply[0] = itemIds[i];
      itemSupply[1] = itemSupplies[itemSupply[0]];

      supplies[i] = itemSupply;
    }

    return supplies;
  }

  function allItemURIs() external view returns (string[] memory) {
    string[] memory uris = new string[](itemIds.length);

    for (uint256 i = 0; i < itemIds.length; i++) {
      uris[i] = uri(itemIds[i]);
    }

    return uris;
  }

  function balanceOfAll(address _address) external view returns(uint256[][] memory) {
    uint256[][] memory balances = new uint256[][](itemIds.length);

    for (uint256 i = 0; i < itemIds.length; i++) {
      uint256[] memory itemBalance = new uint256[](2);

      itemBalance[0] = itemIds[i];
      itemBalance[1] = balanceOf(_address, itemIds[i]);

      balances[i] = itemBalance;
    }

    return balances;
  }

  function paginateItemIds(uint256 _itemIdsStartIndexInclusive, uint256 _limit) external view returns (uint256[] memory) {
    uint256 totalPaginatable = _itemIdsStartIndexInclusive < itemIds.length ? itemIds.length - _itemIdsStartIndexInclusive : 0;
    uint256 totalPaginate = totalPaginatable <= _limit ? totalPaginatable : _limit;
    uint256[] memory ids = new uint256[](totalPaginate);

    for (uint256 i = 0; i < totalPaginate; i++) {
      ids[i] = itemIds[_itemIdsStartIndexInclusive + i];
    }

    return ids;
  }

  function paginateItemSupplies(uint256 _itemIdsStartIndexInclusive, uint256 _limit) external view returns (uint256[][] memory) {
    uint256 totalPaginatable = _itemIdsStartIndexInclusive < itemIds.length ? itemIds.length - _itemIdsStartIndexInclusive : 0;
    uint256 totalPaginate = totalPaginatable <= _limit ? totalPaginatable : _limit;
    uint256[][] memory supplies = new uint256[][](totalPaginate);

    for (uint256 i = 0; i < totalPaginate; i++) {
      uint256[] memory supply = new uint256[](2);

      supply[0] = itemIds[_itemIdsStartIndexInclusive + i];
      supply[1] = itemSupplies[supply[0]];

      supplies[i] = supply;
    }

    return supplies;
  }

  function paginateItemURIs(uint256 _itemIdsStartIndexInclusive, uint256 _limit) external view returns (string[] memory) {
    uint256 totalPaginatable = _itemIdsStartIndexInclusive < itemIds.length ? itemIds.length - _itemIdsStartIndexInclusive : 0;
    uint256 totalPaginate = totalPaginatable <= _limit ? totalPaginatable : _limit;
    string[] memory uris = new string[](totalPaginate);

    for (uint256 i = 0; i < totalPaginate; i++) {
      uris[i] = uri(itemIds[_itemIdsStartIndexInclusive + i]);
    }

    return uris;
  }

  /**
   * @dev Support for gasless transactions
   */

  function upgradeTrustedForwarder(address _newTrustedForwarder) external onlyRole(MANAGER_ROLE) {
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
    super._beforeTokenTransfer(operator, from, to, ids, amounts, data);

    for (uint256 i = 0; i < ids.length; i++) {
      uint256 id = ids[i];

      require(
        (
          isItemTransferrable(id) ||
          from == address(0) || // allow mint
          hasRole(MANAGER_ROLE, from) || // allow manager transfers
          hasRole(MINTER_ROLE, from) || // allow minter transfers
          to == address(0) // allow burn
        ),
        "Item is not currently transferable."
      );

      if (from == address(0)) {
        setItemIdExists(id);
        itemSupplies[id] += amounts[i];
      }

      if (to == address(0)) {
        require(itemSupplies[id] >= amounts[i], "ERC1155: burn amount exceeds itemSupply");

        itemSupplies[id] = itemSupplies[id] - amounts[i];
      }
    }
  }

  /**
   * @dev Support for roles & control
   */

  function grantRole(bytes32 _role, address _account) public virtual override {
    bool isAdmin = hasRole(DEFAULT_ADMIN_ROLE, _msgSender());
    bool isManager = hasRole(MANAGER_ROLE, _msgSender());

    require(isAdmin || isManager, "Role granting requires admin or manager role.");

    if (_role == DEFAULT_ADMIN_ROLE || _role == MANAGER_ROLE) {
      require(isAdmin, "Only admin can grant admin or manager role.");
    }

    _grantRole(_role, _account);
  }

  function transferOwnershipControl(address _newOwner) external onlyOwner {
    transferOwnership(_newOwner);
    _grantRole(DEFAULT_ADMIN_ROLE, _newOwner);
    _revokeRole(DEFAULT_ADMIN_ROLE, _msgSender());
  }

  /**
   * @dev ERC165
   */

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, IERC165, AccessControl) returns (bool) {
    return interfaceId == type(IERC1155_Game_Items_Collection).interfaceId || super.supportsInterface(interfaceId);
  }

  /**
   * @dev Helpers
   */

  function setItemIdExists(uint256 _id) private {
    if (!itemExists[_id]) {
      itemIds.push(_id); // set, so only adds if unique
      itemExists[_id] = true;
    }
  }

  /**
   * @dev Modifiers
   */

  modifier canMint {
    require(hasRole(MANAGER_ROLE, _msgSender()) || hasRole(MINTER_ROLE, _msgSender()), "Not authorized to mint.");
    _;
  }

  modifier canBurn(address _fromAddress) {
    require(_fromAddress == _msgSender() || isApprovedForAll(_fromAddress, _msgSender()), "Not approved to burn.");
    _;
  }
}
