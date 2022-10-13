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
import "../Items_Collection/IERC1155_Game_Items_Collection.sol";

interface IGame_Items_Merchant  {
  // structs
  struct ItemOffer {
    bool isActive;
    uint256[] itemIds;
    uint256[] itemAmounts;
    uint256 currencyAmount;
    uint256 uses;
    uint256 maxUses;
    IERC1155_Game_Items_Collection itemsCollection;
    IERC20 currency;
  }

  // function
  function allBuyableItemOfferIds() external view returns (bytes32[] memory);
  function getBuyableItemOffer(bytes32 _itemOfferId) external view returns (ItemOffer memory);
  function paginateBuyableItemOffers(uint256 _startIndexInclusive, uint256 _limit) external view returns (ItemOffer[] memory);
  function totalBuyableItemOffers() external view returns (uint256);
  function setBuyableItemOffer(address _itemsCollectionAddress, uint256[] calldata _itemIds, uint256[] calldata _itemAmounts, address _currencyAddress, uint256 _currencyAmount, uint256 _maxUses) external;
  function removeBuyableItemOffer(bytes32 _itemOfferId) external;
  function allSellableItemOfferIds() external view returns (bytes32[] memory);
  function getSellableItemOffer(bytes32 _itemOfferId) external view returns (ItemOffer memory);
  function paginateSellableItemOffers(uint256 _startIndexInclusive, uint256 _limit) external view returns (ItemOffer[] memory);
  function totalSellableItemOffers() external view returns (uint256);
  function setSellableItemOffer(address _itemsCollectionAddress, uint256[] calldata _itemIds, uint256[] calldata _itemAmounts, address _currencyAddress, uint256 _currencyAmount, uint256 _maxUses) external;
  function removeSellableItemOffer(bytes32 _itemOfferId) external;
  function generateItemOfferId(address _itemsCollectionAddress, address _currencyAddress, uint256[] calldata _itemIds) external pure returns(bytes32);
  function buy(bytes32 _itemOfferId) external payable;
  function sell(bytes32 _itemOfferId) external;
  function withdrawTo(address _to) external;
  function withdrawCurrencyTo(address _currencyAddress, address _to) external;
  function withdrawItemsTo(address _itemsCollectionAddress, uint256[] calldata _itemIds, address _to) external;
}