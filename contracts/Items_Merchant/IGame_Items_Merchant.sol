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
  // enums
  enum ItemOfferType { UNSET, BUYABLE, SELLABLE }

  // structs
  struct ItemOffer {
    uint256 id;
    uint256[] itemIds;
    uint256[] itemAmounts;
    uint256 currencyAmount;
    uint256 uses;
    uint256 maxUses;
    uint256 lastUpdatedAt;
    ItemOfferType offerType;
    IERC1155_Game_Items_Collection itemsCollection;
    IERC20 currency;
  }

  // events
  event Buy(uint256 indexed offerId, ItemOffer offer, address buyer);
  event BuyOfferSet(uint256 indexed offerId, ItemOffer offer);
  event BuyOfferRemoved(uint256 indexed offerId, ItemOffer offer);
  event Sell(uint256 indexed offerId, ItemOffer offer, address seller);
  event SellOfferSet(uint256 indexed offerId, ItemOffer offer);
  event SellOfferRemoved(uint256 indexed offerId, ItemOffer offer);

  // function
  function allItemOfferIds() external view returns (uint256[] memory);

  function allItemOffers() external view returns (ItemOffer[] memory);
  function allItemOfferLastUpdates() external view returns (uint256[][] memory);
  function paginateItemOfferIds(uint256 _startIndexInclusive, uint256 _limit) external view returns(uint256[] memory);
  function paginateItemOffers(uint256 _startIndexInclusive, uint256 _limit) external view returns(ItemOffer[] memory);
  function paginateItemOfferLastUpdates(uint256 _startIndexInclusive, uint256 _limit) external view returns(uint256[][] memory);
  function itemOfferId(uint256 _index) external view returns (uint256);
  function itemOffer(uint256 _itemOfferId) external view returns (ItemOffer memory);
  function itemOfferLastUpdate(uint256 _itemOfferId) external view returns (uint256[] memory);
  function totalItemOffers() external view returns (uint256);

  function setItemOffer(uint256 _itemOfferId, ItemOfferType _type, address _itemsCollectionAddress, uint256[] calldata _itemIds, uint256[] calldata _itemAmounts, address _currencyAddress, uint256 _currencyAmount, uint256 _maxUses) external;
  function removeItemOffer(uint256 _itemOfferId) external;
  function useItemOffer(uint256 _itemOfferId) external payable;

  function withdrawTo(address _to) external;
  function withdrawCurrencyTo(address _currencyAddress, address _to) external;
  function withdrawItemsTo(address _itemsCollectionAddress, uint256[] calldata _itemIds, address _to) external;
}
