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
  enum OfferType { UNSET, BUYABLE, SELLABLE }

  // structs
  struct Offer {
    uint256 id;
    uint256[] itemIds;
    uint256[] itemAmounts;
    uint256 currencyAmount;
    uint256 uses;
    uint256 maxUses;
    uint256 lastUpdatedAt;
    OfferType offerType;
    IERC1155_Game_Items_Collection itemsCollection;
    IERC20 currency;
  }

  // events
  event Buy(uint256 indexed offerId, Offer offer, address buyer);
  event BuyOfferSet(uint256 indexed offerId, Offer offer);
  event BuyOfferRemoved(uint256 indexed offerId, Offer offer);
  event Sell(uint256 indexed offerId, Offer offer, address seller);
  event SellOfferSet(uint256 indexed offerId, Offer offer);
  event SellOfferRemoved(uint256 indexed offerId, Offer offer);

  // function
  function allOfferIds() external view returns (uint256[] memory);

  function allOffers() external view returns (Offer[] memory);
  function allOfferLastUpdates() external view returns (uint256[][] memory);
  function paginateOfferIds(uint256 _startIndexInclusive, uint256 _limit) external view returns(uint256[] memory);
  function paginateOffers(uint256 _startIndexInclusive, uint256 _limit) external view returns(Offer[] memory);
  function paginateOfferLastUpdates(uint256 _startIndexInclusive, uint256 _limit) external view returns(uint256[][] memory);
  function offerId(uint256 _index) external view returns (uint256);
  function offer(uint256 _offerId) external view returns (Offer memory);
  function offerLastUpdate(uint256 _offerId) external view returns (uint256[] memory);
  function totalOffers() external view returns (uint256);

  function setOffer(uint256 _offerId, OfferType _type, address _itemsCollectionAddress, uint256[] calldata _itemIds, uint256[] calldata _itemAmounts, address _currencyAddress, uint256 _currencyAmount, uint256 _maxUses) external;
  function removeOffer(uint256 _offerId) external;
  function useOffer(uint256 _offerId) external payable;

  function withdrawTo(address _to) external;
  function withdrawCurrencyTo(address _currencyAddress, address _to) external;
  function withdrawItemsTo(address _itemsCollectionAddress, uint256[] calldata _itemIds, address _to) external;
}
