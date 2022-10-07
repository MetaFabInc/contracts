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
import "../Items/IERC1155_Game_Items.sol";

interface IGame_Items_Merchant  {
  // structs
  struct ItemOffer {
    bool isActive;
    uint256[] itemIds;
    uint256[] itemAmounts;
    uint256 currencyAmount;
    IERC1155_Game_Items items;
    IERC20 currency;
  }

  // autogenerated getters
  function buyableItemOfferIds(uint256 index) external view returns (bytes32);
  function sellableItemOfferIds(uint256 index) external view returns (bytes32);

  // function
  function getBuyableItemOffer(bytes32 _itemOfferId) external view returns (ItemOffer memory);
  function setBuyableItemOffer(address _itemsAddress, uint256[] calldata _itemIds, uint256[] calldata _itemAmounts, address _currencyAddress, uint256 _currencyAmount) external;
  function removeBuyableItemOffer(bytes32 _itemOfferId) external;
  function getSellableItemOffer(bytes32 _itemOfferId) external view returns (ItemOffer memory);
  function setSellableItemOffer(address _itemsAddress, uint256[] calldata _itemIds, uint256[] calldata _itemAmounts, address _currencyAddress, uint256 _currencyAmount) external;
  function removeSellableItemOffer(bytes32 _itemOfferId) external;
  function generateItemOfferId(address _itemsAddress, address _currencyAddress, uint256[] calldata _itemIds) external pure returns(bytes32);
  function totalBuyableItemOffers() external view returns (uint256);
  function totalSellableItemOffers() external view returns (uint256);
  function buy(bytes32 _itemOfferId) external payable;
  function sell(bytes32 _itemOfferId) external;
}
