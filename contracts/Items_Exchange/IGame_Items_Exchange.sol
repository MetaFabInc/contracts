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

interface IGame_Items_Exchange  {
  // structs
  struct Offer {
    uint256 id;

    IERC1155 requiredItemsCollection;
    IERC20 requiredCurrency;
    uint256[] requiredItemIds;
    uint256[] requiredItemAmounts;
    uint256 requiredCurrencyAmount;

    IERC1155 givenItemsCollection;
    IERC20 givenCurrency;
    uint256[] givenItemIds;
    uint256[] givenItemAmounts;
    uint256 givenCurrencyAmount;

    uint256 uses;
    uint256 maxUses;
    uint256 lastUpdatedAt;
  }

  // events
  event OfferUsed(uint256 indexed offerId, Offer offer, address user);
  event OfferSet(uint256 indexed offerId, Offer offer);
  event OfferRemoved(uint256 indexed offerId, Offer offer);

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

  function setOffer(
    uint256 _offerId,
    address[2] calldata _requiredGivenItemsCollections, // 0: requiredItemsCollection, 1: givenItemsCollection
    address[2] calldata _requiredGivenCurrency,         // 0: requiredCurrency, 1: givenCurrency
    uint256[][2] calldata _requiredGivenItemIds,        // 0: requiredItemIds, 1: givenItemIds
    uint256[][2] calldata _requiredGivenItemAmounts,    // 0: requiredItemAmounts, 1: givenItemAmounts
    uint256[2] calldata _requiredGivenCurrencyAmounts,  // 0: requiredCurrencyAmounts, 1: givenCurrencyAmounts
    uint256 _maxUses
  ) external;
  function removeOffer(uint256 _offerId) external;
  function useOffer(uint256 _offerId) external payable;

  function withdrawTo(address _to) external;
  function withdrawCurrencyTo(address _currencyAddress, address _to) external;
  function withdrawItemsTo(address _itemsCollectionAddress, uint256[] calldata _itemIds, address _to) external;
}
