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

    IERC1155 inputCollection;
    uint256[] inputCollectionItemIds;
    uint256[] inputCollectionItemAmounts;
    IERC20 inputCurrency;
    uint256 inputCurrencyAmount;

    IERC1155 outputCollection;
    uint256[] outputCollectionItemIds;
    uint256[] outputCollectionItemAmounts;
    IERC20 outputCurrency;
    uint256 outputCurrencyAmount;

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
    address[2] calldata _inputOutputCollections,              // 0: inputItemsCollection, 1: outputItemsCollection
    uint256[][2] calldata _inputOutputCollectionItemIds,      // 0: inputItemIds, 1: outputItemIds
    uint256[][2] calldata _inputOutputCollectionItemAmounts,  // 0: inputItemAmounts, 1: outputItemAmounts
    address[2] calldata _inputOutputCurrency,                 // 0: inputCurrency, 1: outputCurrency
    uint256[2] calldata _inputOutputCurrencyAmounts,          // 0: inputCurrencyAmounts, 1: outputCurrencyAmounts
    uint256 _maxUses
  ) external;
  function removeOffer(uint256 _offerId) external;
  function useOffer(uint256 _offerId) external payable;

  function withdrawTo(address _to) external;
  function withdrawCurrencyTo(address _currencyAddress, address _to) external;
  function withdrawItemsTo(address _collectionAddress, uint256[] calldata _itemIds, address _to) external;
}
