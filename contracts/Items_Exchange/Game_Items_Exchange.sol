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
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./IGame_Items_Exchange.sol";
import "../Currency/IERC20_Game_Currency.sol";
import "../Items_Collection/IERC1155_Game_Items_Collection.sol";
import "../common/ERC2771Context_Upgradeable.sol";
import "../common/Roles.sol";

contract Game_Items_Exchange is IGame_Items_Exchange, ERC2771Context_Upgradeable, Roles, AccessControl, ReentrancyGuard, ERC1155Holder {
  using EnumerableSet for EnumerableSet.UintSet;

  EnumerableSet.UintSet private offerIds;
  mapping(uint256 => Offer) private offers;

  constructor(address _forwarder)
  ERC2771Context_Upgradeable(_forwarder) {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(OWNER_ROLE, _msgSender());
  }

  /**
   * @dev Offer data retrieval
   */

  function allOfferIds() external view returns (uint256[] memory) {
    return offerIds.values();
  }

  function allOffers() external view returns (Offer[] memory) {
    Offer[] memory offersResult = new Offer[](totalOffers());

    for (uint256 i = 0; i < totalOffers(); i++) {
      offersResult[i] = offers[offerIds.at(i)];
    }

    return offersResult;
  }

  function allOfferLastUpdates() external view returns (uint256[][] memory) {
    uint256[][] memory offerLastUpdates = new uint256[][](totalOffers());

    for (uint256 i = 0; i < totalOffers(); i++) {
      offerLastUpdates[i] = offerLastUpdate(offerIds.at(i));
    }

    return offerLastUpdates;
  }

  function paginateOfferIds(uint256 _startIndexInclusive, uint256 _limit) external view returns(uint256[] memory) {
    uint256 totalPaginatable = _startIndexInclusive < offerIds.length() ? offerIds.length() - _startIndexInclusive : 0;
    uint256 totalPaginate = totalPaginatable <= _limit ? totalPaginatable : _limit;

    uint256[] memory paginatedOfferIds = new uint256[](totalPaginate);

    for (uint256 i = 0; i < totalPaginate; i++) {
      paginatedOfferIds[i] = offerIds.at(_startIndexInclusive + i);
    }

    return paginatedOfferIds;
  }

  function paginateOffers(uint256 _startIndexInclusive, uint256 _limit) external view returns(Offer[] memory) {
    uint256 totalPaginatable = _startIndexInclusive < offerIds.length() ? offerIds.length() - _startIndexInclusive : 0;
    uint256 totalPaginate = totalPaginatable <= _limit ? totalPaginatable : _limit;

    Offer[] memory paginatedOffers = new Offer[](totalPaginate);

    for (uint256 i = 0; i < totalPaginate; i++) {
      paginatedOffers[i] = offers[offerIds.at(_startIndexInclusive + i)];
    }

    return paginatedOffers;
  }

  function paginateOfferLastUpdates(uint256 _startIndexInclusive, uint256 _limit) external view returns(uint256[][] memory) {
    uint256 totalPaginatable = _startIndexInclusive < offerIds.length() ? offerIds.length() - _startIndexInclusive : 0;
    uint256 totalPaginate = totalPaginatable <= _limit ? totalPaginatable : _limit;

    uint256[][] memory paginatedOfferLastUpdates = new uint256[][](totalPaginate);

    for(uint256 i = 0; i < totalPaginate; i++) {
      paginatedOfferLastUpdates[i] = offerLastUpdate(offerIds.at(_startIndexInclusive + i));
    }

    return paginatedOfferLastUpdates;
  }

  function offerId(uint256 _index) external view returns (uint256) {
    require(_index < offerIds.length(), "Index out of bounds");

    return offerIds.at(_index);
  }

  function offer(uint256 _offerId) external view returns (Offer memory) {
    require(offerIds.contains(_offerId), "offerId does not exist or has been removed.");

    return offers[_offerId];
  }

  function offerLastUpdate(uint256 _offerId) public view returns (uint256[] memory) {
    uint256[] memory offerLastUpdateResult = new uint256[](2);

    offerLastUpdateResult[0] = _offerId;
    offerLastUpdateResult[1] = offers[_offerId].lastUpdatedAt;

    return offerLastUpdateResult;
  }

  function totalOffers() public view returns (uint256) {
    return offerIds.length();
  }

  /**
   * @dev Management
   */

  function setOffer(
    uint256 _offerId,
    address[2] calldata _requiredGivenItemsCollections, // 0: requiredItemsCollection, 1: givenItemsCollection
    address[2] calldata _requiredGivenCurrency,         // 0: requiredCurrency, 1: givenCurrency
    uint256[][2] calldata _requiredGivenItemIds,        // 0: requiredItemIds, 1: givenItemIds
    uint256[][2] calldata _requiredGivenItemAmounts,    // 0: requiredItemAmounts, 1: givenItemAmounts
    uint256[2] calldata _requiredGivenCurrencyAmounts,  // 0: requiredCurrencyAmounts, 1: givenCurrencyAmounts
    uint256 _maxUses
  ) external onlyRole(OWNER_ROLE) {
    require(_requiredGivenItemIds[0].length == _requiredGivenItemAmounts[0].length, "requiredItemIds and requiredItemAmounts size mistmatch");
    require(_requiredGivenItemIds[1].length == _requiredGivenItemAmounts[1].length, "givenItemIds and givenItemAmounts size mismatch");

    Offer memory offerSet = Offer({
      id: _offerId,
      requiredItemsCollection: IERC1155(_requiredGivenItemsCollections[0]),
      requiredCurrency: IERC20_Game_Currency(_requiredGivenCurrency[0]),
      requiredItemIds: _requiredGivenItemIds[0],
      requiredItemAmounts: _requiredGivenItemAmounts[0],
      requiredCurrencyAmount: _requiredGivenCurrencyAmounts[0],
      givenItemsCollection: IERC1155(_requiredGivenItemsCollections[1]),
      givenCurrency: IERC20_Game_Currency(_requiredGivenCurrency[1]),
      givenItemIds: _requiredGivenItemIds[1],
      givenItemAmounts: _requiredGivenItemAmounts[1],
      givenCurrencyAmount: _requiredGivenCurrencyAmounts[1],
      uses: offers[_offerId].uses,
      maxUses: _maxUses,
      lastUpdatedAt: block.timestamp
    });

    offerIds.add(_offerId);
    offers[_offerId] = offerSet;

    emit OfferSet(_offerId, offerSet);
  }

  function removeOffer(uint256 _offerId) external onlyRole(OWNER_ROLE) {
    offerIds.remove(_offerId);

    Offer storage offerRemoved = offers[_offerId];

    emit OfferRemoved(_offerId, offerRemoved);

    offerRemoved.uses = 0;
  }

  function useOffer(uint256 _offerId) external payable nonReentrant {
    require(offerIds.contains(_offerId), "offerId does not exist or has been removed.");

    Offer storage offerUsed = offers[_offerId];
    require(offerUsed.maxUses == 0 || offerUsed.uses < offerUsed.maxUses, "Offer has reached max uses.");

    if (address(offerUsed.requiredItemsCollection) != address(0)) {
      offerUsed.requiredItemsCollection.safeBatchTransferFrom(_msgSender(), address(this), offerUsed.requiredItemIds, offerUsed.requiredItemAmounts, "");
    }

    if (offerUsed.requiredCurrencyAmount > 0) {
      if (address(offerUsed.requiredCurrency) != address(0)) {
        offerUsed.requiredCurrency.transferFrom(_msgSender(), address(this), offerUsed.requiredCurrencyAmount);
      } else {
        require(msg.value >= offerUsed.requiredCurrencyAmount, "Payment less than cost");
      }
    }

    if (address(offerUsed.givenItemsCollection) != address(0)) {
      if (_exchangeCanMint(address(offerUsed.givenItemsCollection))) {
        IERC1155_Game_Items_Collection gameItemsCollection = IERC1155_Game_Items_Collection(address(offerUsed.givenItemsCollection));
        gameItemsCollection.mintBatchToAddress(_msgSender(), offerUsed.givenItemIds, offerUsed.givenItemAmounts);
      } else {
        offerUsed.givenItemsCollection.safeBatchTransferFrom(address(this), _msgSender(), offerUsed.givenItemIds, offerUsed.givenItemAmounts, "");
      }
    }

    if (address(offerUsed.givenCurrency) != address(0)) {
      if (_exchangeCanMint(address(offerUsed.givenCurrency))) {
        IERC20_Game_Currency gameCurrency = IERC20_Game_Currency(address(offerUsed.givenCurrency));
        gameCurrency.mint(_msgSender(), offerUsed.givenCurrencyAmount);
      } else {
        offerUsed.givenCurrency.transfer(_msgSender(), offerUsed.givenCurrencyAmount);
      }
    } else if (offerUsed.givenCurrencyAmount > 0) {
      payable(_msgSender()).transfer(offerUsed.givenCurrencyAmount);
    }

    offerUsed.uses++;

    emit OfferUsed(_offerId, offerUsed, _msgSender());
  }

  /**
   * @dev Withdrawals
   */

  function withdrawTo(address _to) external onlyRole(OWNER_ROLE) {
    payable(_to).transfer(address(this).balance);
  }

  function withdrawCurrencyTo(address _currencyAddress, address _to) external onlyRole(OWNER_ROLE) {
    IERC20 currency = IERC20(_currencyAddress);

    currency.transfer(_to, currency.balanceOf(address(this)));
  }

  function withdrawItemsTo(address _itemsCollectionAddress, uint256[] calldata _itemIds, address _to) external onlyRole(OWNER_ROLE) {
    IERC1155 items = IERC1155(_itemsCollectionAddress);
    uint256[] memory itemBalances = new uint256[](_itemIds.length);

    for (uint256 i = 0; i < _itemIds.length; i++) {
      itemBalances[i] = items.balanceOf(address(this), _itemIds[i]);
    }

    items.safeBatchTransferFrom(address(this), _to, _itemIds, itemBalances, "");
  }

  /**
   * @dev Deposits
   */

  receive() external payable {}

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
   * @dev ERC165
   */

  function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, ERC1155Receiver) returns (bool) {
    return
      interfaceId == type(IGame_Items_Exchange).interfaceId ||
      interfaceId == type(IERC1155Receiver).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  /**
   * @dev Helpers
   */

  function _exchangeCanMint(address _contractAddress) private view returns (bool) {
    IAccessControl accessControlCheck = IAccessControl(_contractAddress);

    return accessControlCheck.hasRole(MINTER_ROLE, address(this));
  }
}
