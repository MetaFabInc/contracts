// SPDX-License-Identifier: Commons-Clause-1.0
//  __  __     _        ___     _
// |  \/  |___| |_ __ _| __|_ _| |__
// | |\/| / -_)  _/ _` | _/ _` | '_ \
// |_|  |_\___|\__\__,_|_|\__,_|_.__/
//
// Launch your crypto game or gamefi project's blockchain
// infrastructure & game APIs fast with https://trymetafab.com

pragma solidity ^0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface IGame_Lootbox  {
  // structs
  struct Lootbox {
    uint256 id;

    IERC1155 inputCollection;
    uint256[] inputCollectionItemIds;
    uint256[] inputCollectionItemAmounts;

    IERC1155 outputCollection;
    uint256[] outputCollectionItemIds;
    uint256[] outputCollectionItemAmounts;
    uint256[] outputCollectionItemWeights;
    uint256 outputTotalItems;
    uint256 lastUpdatedAt;
  }

  // events
  event LootboxOpened(uint256 indexed lootboxId, Lootbox lootbox, address user);
  event LootboxSet(uint256 indexed lootboxId, Lootbox lootbox);
  event LootboxRemoved(uint256 indexed lootboxId, Lootbox lootbox);

  // function
  function allLootboxIds() external view returns (uint256[] memory);

  function allLootboxes() external view returns (Lootbox[] memory);
  function allLootboxLastUpdates() external view returns (uint256[][] memory);
  function paginateLootboxIds(uint256 _startIndexInclusive, uint256 _limit) external view returns(uint256[] memory);
  function paginateLootboxes(uint256 _startIndexInclusive, uint256 _limit) external view returns(Lootbox[] memory);
  function paginateLootboxLastUpdates(uint256 _startIndexInclusive, uint256 _limit) external view returns(uint256[][] memory);
  function lootboxId(uint256 _index) external view returns (uint256);
  function lootbox(uint256 _lootboxId) external view returns (Lootbox memory);
  function lootboxLastUpdate(uint256 _lootboxId) external view returns (uint256[] memory);
  function totalLootboxes() external view returns (uint256);

  function setLootbox(
    uint256 _lootboxId,
    address[2] calldata _inputOutputCollections,              // 0: inputItemsCollection, 1: outputItemsCollection
    uint256[][2] calldata _inputOutputCollectionItemIds,      // 0: inputItemIds, 1: outputItemIds
    uint256[][2] calldata _inputOutputCollectionItemAmounts,  // 0: inputItemAmounts, 1: outputItemAmounts
    uint256[] calldata _outputCollectionItemWeights,
    uint256 outputTotalItems
  ) external;
  function removeLootbox(uint256 _lootboxId) external;
  function openLootbox(uint256 _lootboxId) external payable;
}
