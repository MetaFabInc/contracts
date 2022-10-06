// SPDX-License-Identifier: Commons-Clause-1.0
//  __  __     _        ___     _
// |  \/  |___| |_ __ _| __|_ _| |__
// | |\/| / -_)  _/ _` | _/ _` | '_ \
// |_|  |_\___|\__\__,_|_|\__,_|_.__/
//
// Launch your crypto game or gamefi project's blockchain
// infrastructure & game APIs fast with https://trymetafab.com

pragma solidity ^0.8.16;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

interface IERC1155_Game_Items is IERC1155, IAccessControl  {
  // getters
  function itemURIs(uint256) external view returns(string memory);
  function itemTransferTimelocks(uint256) external view returns(uint256);

  // functions
  function setItemURI(uint256 _itemId, string memory _uri) external;
  function bulkSetItemURIs(uint256[] calldata _itemIds, string[] memory _uris) external;
  function isItemTransferrable(uint256 _itemId) external view;
  function setItemTransferTimelock(uint256 _itemId, uint256 _unlockTimestamp) external;
  function mintToAddress(address _toAddress, uint256 _itemId, uint256 _quantity) external;
  function mintBatchToAddress(address _toAddress, uint256[] calldata _itemIds, uint256[] calldata _quantities) external;
  function burnFromAddress(address _fromAddress, uint256 _itemId, uint256 _quantity) external;
  function burnBatchFromAddress(address _fromAddress, uint256[] calldata _itemIds, uint256[] calldata _quantities) external;
  function burn(uint256 _itemId, uint256 _quantity) external;
  function bulkSafeTransfer(address[] calldata _toAddresses, uint256 _itemId, uint256 _quantityPerAddress) external;
  function bulkSafeBatchTransfer(address[] calldata _toAddresses, uint256[] calldata _itemIds, uint256[] calldata _quantitiesPerAddress) external;
}
