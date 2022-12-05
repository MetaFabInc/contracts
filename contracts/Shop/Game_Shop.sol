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
import "./IGame_Shop.sol";
import "../Currency/IERC20_Game_Currency.sol";
import "../Items_Collection/IERC1155_Game_Items_Collection.sol";
import "../common/ERC2771Context_Upgradeable.sol";
import "../common/Roles.sol";
import "../common/System.sol";

contract Game_Shop is IGame_Shop, ERC2771Context_Upgradeable, Roles, System, AccessControl, ReentrancyGuard, ERC1155Holder {
  using EnumerableSet for EnumerableSet.UintSet;

  EnumerableSet.UintSet private offerIds;
  mapping(uint256 => Offer) private offers;

  constructor(address _forwarder, bytes32 _systemId)
  ERC2771Context_Upgradeable(_forwarder)
  System(_systemId) {
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
    address[2] calldata _inputOutputCollections,              // 0: inputItemsCollection, 1: outputItemsCollection
    uint256[][2] calldata _inputOutputCollectionItemIds,      // 0: inputItemIds, 1: outputItemIds
    uint256[][2] calldata _inputOutputCollectionItemAmounts,  // 0: inputItemAmounts, 1: outputItemAmounts
    address[2] calldata _inputOutputCurrency,                 // 0: inputCurrency, 1: outputCurrency
    uint256[2] calldata _inputOutputCurrencyAmounts,          // 0: inputCurrencyAmounts, 1: outputCurrencyAmounts
    uint256 _maxUses
  ) external onlyRole(OWNER_ROLE) {
    require(_inputOutputCollectionItemIds[0].length == _inputOutputCollectionItemAmounts[0].length, "Input items and amounts mismatched");
    require(_inputOutputCollectionItemIds[1].length == _inputOutputCollectionItemAmounts[1].length, "Output items and amounts mismatched");

    Offer memory offerSet = Offer({
      id: _offerId,
      inputCollection: IERC1155(_inputOutputCollections[0]),
      inputCollectionItemIds: _inputOutputCollectionItemIds[0],
      inputCollectionItemAmounts: _inputOutputCollectionItemAmounts[0],
      inputCurrency: IERC20(_inputOutputCurrency[0]),
      inputCurrencyAmount: _inputOutputCurrencyAmounts[0],
      outputCollection: IERC1155(_inputOutputCollections[1]),
      outputCollectionItemIds: _inputOutputCollectionItemIds[1],
      outputCollectionItemAmounts: _inputOutputCollectionItemAmounts[1],
      outputCurrency: IERC20(_inputOutputCurrency[1]),
      outputCurrencyAmount: _inputOutputCurrencyAmounts[1],
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

    if (address(offerUsed.inputCollection) != address(0)) {
      offerUsed.inputCollection.safeBatchTransferFrom(_msgSender(), address(this), offerUsed.inputCollectionItemIds, offerUsed.inputCollectionItemAmounts, "");
    }

    if (offerUsed.inputCurrencyAmount > 0) {
      if (address(offerUsed.inputCurrency) != address(0)) {
        offerUsed.inputCurrency.transferFrom(_msgSender(), address(this), offerUsed.inputCurrencyAmount);
      } else {
        require(msg.value >= offerUsed.inputCurrencyAmount, "Payment less than cost");
      }
    }

    if (address(offerUsed.outputCollection) != address(0)) {
      if (_shopCanMint(address(offerUsed.outputCollection))) {
        IERC1155_Game_Items_Collection gameItemsCollection = IERC1155_Game_Items_Collection(address(offerUsed.outputCollection));
        gameItemsCollection.mintBatchToAddress(_msgSender(), offerUsed.outputCollectionItemIds, offerUsed.outputCollectionItemAmounts);
      } else {
        offerUsed.outputCollection.safeBatchTransferFrom(address(this), _msgSender(), offerUsed.outputCollectionItemIds, offerUsed.outputCollectionItemAmounts, "");
      }
    }

    if (address(offerUsed.outputCurrency) != address(0)) {
      if (_shopCanMint(address(offerUsed.outputCurrency))) {
        IERC20_Game_Currency gameCurrency = IERC20_Game_Currency(address(offerUsed.outputCurrency));
        gameCurrency.mint(_msgSender(), offerUsed.outputCurrencyAmount);
      } else {
        offerUsed.outputCurrency.transfer(_msgSender(), offerUsed.outputCurrencyAmount);
      }
    } else if (offerUsed.outputCurrencyAmount > 0) {
      payable(_msgSender()).transfer(offerUsed.outputCurrencyAmount);
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

  function withdrawItemsTo(address _collectionAddress, uint256[] calldata _itemIds, address _to) external onlyRole(OWNER_ROLE) {
    IERC1155 items = IERC1155(_collectionAddress);
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
      interfaceId == type(IGame_Shop).interfaceId ||
      interfaceId == type(IERC1155Receiver).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  /**
   * @dev Helpers
   */

  function _shopCanMint(address _contractAddress) private view returns (bool) {
    IAccessControl accessControlCheck = IAccessControl(_contractAddress);

    return accessControlCheck.hasRole(MINTER_ROLE, address(this));
  }
}
