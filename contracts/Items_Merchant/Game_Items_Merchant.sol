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
import "./IGame_Items_Merchant.sol";
import "../Currency/IERC20_Game_Currency.sol";
import "../common/ERC2771Context_Upgradeable.sol";
import "../common/Roles.sol";

contract Game_Items_Merchant is IGame_Items_Merchant, ERC2771Context_Upgradeable, Roles, AccessControl, ReentrancyGuard, ERC1155Holder {
  using EnumerableSet for EnumerableSet.UintSet;

  EnumerableSet.UintSet private itemOfferIds;
  mapping(uint256 => ItemOffer) private itemOffers;

  constructor(address _forwarder)
  ERC2771Context_Upgradeable(_forwarder) {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(OWNER_ROLE, _msgSender());
  }

  /**
   * @dev Offer data retrieval
   */

  function allItemOfferIds() external view returns (uint256[] memory) {
    return itemOfferIds.values();
  }

  function allItemOffers() external view returns (ItemOffer[] memory) {
    uint256 totalOffers = itemOfferIds.length();
    ItemOffer[] memory offers = new ItemOffer[](totalOffers);

    for (uint256 i = 0; i < totalOffers; i++) {
      offers[i] = itemOffers[itemOfferIds.at(i)];
    }

    return offers;
  }

  function allItemOfferLastUpdates() external view returns (uint256[][] memory) {
    uint256 totalOffers = itemOfferIds.length();
    uint256[][] memory offerLastUpdates = new uint256[][](totalOffers);

    for (uint256 i = 0; i < totalOffers; i++) {
      uint256[] memory offerLastUpdate = new uint256[](2);

      offerLastUpdate[0] = itemOfferIds.at(i);
      offerLastUpdate[1] = itemOffers[offerLastUpdate[0]].lastUpdatedAt;

      offerLastUpdates[i] = offerLastUpdate;
    }

    return offerLastUpdates;
  }

  function paginateItemOfferIds(uint256 _startIndexInclusive, uint256 _limit) external view returns(uint256[] memory) {
    uint256 totalPaginatable = _startIndexInclusive < itemOfferIds.length() ? itemOfferIds.length() - _startIndexInclusive : 0;
    uint256 totalPaginate = totalPaginatable <= _limit ? totalPaginatable : _limit;

    uint256[] memory offerIds = new uint256[](totalPaginate);

    for (uint256 i = 0; i < totalPaginate; i++) {
      offerIds[i] = itemOfferIds.at(_startIndexInclusive + i);
    }

    return offerIds;
  }

  function paginateItemOffers(uint256 _startIndexInclusive, uint256 _limit) external view returns(ItemOffer[] memory) {
    uint256 totalPaginatable = _startIndexInclusive < itemOfferIds.length() ? itemOfferIds.length() - _startIndexInclusive : 0;
    uint256 totalPaginate = totalPaginatable <= _limit ? totalPaginatable : _limit;
    ItemOffer[] memory offers = new ItemOffer[](totalPaginate);

    for (uint256 i = 0; i < totalPaginate; i++) {
      offers[i] = itemOffers[itemOfferIds.at(_startIndexInclusive + i)];
    }

    return offers;
  }

  function paginateItemOfferLastUpdates(uint256 _startIndexInclusive, uint256 _limit) external view returns(uint256[][] memory) {
    uint256 totalPaginatable = _startIndexInclusive < itemOfferIds.length() ? itemOfferIds.length() - _startIndexInclusive : 0;
    uint256 totalPaginate = totalPaginatable <= _limit ? totalPaginatable : _limit;

    uint256[][] memory offerLastUpdates = new uint256[][](totalPaginate);

    for(uint256 i = 0; i < totalPaginate; i++) {
      offerLastUpdates[i] = itemOfferLastUpdate(itemOfferIds.at(_startIndexInclusive + i));
    }

    return offerLastUpdates;
  }

  function itemOfferId(uint256 _index) external view returns (uint256) {
    require(_index < itemOfferIds.length(), "Index out of bounds");

    return itemOfferIds.at(_index);
  }

  function itemOffer(uint256 _itemOfferId) external view returns (ItemOffer memory) {
    require(itemOfferIds.contains(_itemOfferId), "itemOfferId does not exist or has been removed.");

    return itemOffers[_itemOfferId];
  }

  function itemOfferLastUpdate(uint256 _itemOfferId) public view returns (uint256[] memory) {
    uint256[] memory offerLastUpdate = new uint256[](2);

    offerLastUpdate[0] = _itemOfferId;
    offerLastUpdate[1] = itemOffers[_itemOfferId].lastUpdatedAt;

    return offerLastUpdate;
  }

  function totalItemOffers() external view returns (uint256) {
    return itemOfferIds.length();
  }

  /**
   * @dev Management
   */

  function setItemOffer(
    uint256 _itemOfferId,
    ItemOfferType _type,
    address _itemsCollectionAddress,
    uint256[] calldata _itemIds,
    uint256[] calldata _itemAmounts,
    address _currencyAddress,
    uint256 _currencyAmount,
    uint256 _maxUses
  ) external onlyRole(OWNER_ROLE) {
    require (_type == ItemOfferType.BUYABLE || _type == ItemOfferType.SELLABLE, "Invalid offer type");
    require(IERC1155_Game_Items_Collection(_itemsCollectionAddress).supportsInterface(type(IERC1155_Game_Items_Collection).interfaceId), "Invalid items contract");

    ItemOffer memory offer = ItemOffer({
      id: _itemOfferId,
      itemIds: _itemIds,
      itemAmounts: _itemAmounts,
      currencyAmount: _currencyAmount,
      uses: itemOffers[_itemOfferId].uses,
      maxUses: _maxUses,
      lastUpdatedAt: block.timestamp,
      offerType: _type,
      itemsCollection: IERC1155_Game_Items_Collection(_itemsCollectionAddress),
      currency: IERC20(_currencyAddress)
    });

    itemOfferIds.add(_itemOfferId);
    itemOffers[_itemOfferId] = offer;

    if (_type == ItemOfferType.BUYABLE) {
      emit BuyOfferSet(_itemOfferId, offer);
    } else {
      emit SellOfferSet(_itemOfferId, offer);
    }
  }

  function removeItemOffer(uint256 _itemOfferId) external onlyRole(OWNER_ROLE) {
    itemOfferIds.remove(_itemOfferId);

    ItemOffer storage offer = itemOffers[_itemOfferId];

    if (offer.offerType == ItemOfferType.BUYABLE) {
      emit BuyOfferRemoved(_itemOfferId, offer);
    } else {
      emit SellOfferRemoved(_itemOfferId, offer);
    }

    offer.uses = 0;
  }

  function useItemOffer(uint256 _itemOfferId) external payable nonReentrant {
    require(itemOfferIds.contains(_itemOfferId), "itemOfferId does not exist or has been removed.");

    ItemOffer storage offer = itemOffers[_itemOfferId];
    require(offer.maxUses == 0 || offer.uses < offer.maxUses, "Offer has reached max uses.");

    // BUY OFFERS
    if (offer.offerType == ItemOfferType.BUYABLE) {
      if (address(offer.currency) != address(0)) { // erc20
        offer.currency.transferFrom(_msgSender(), address(this), offer.currencyAmount);
      } else { // native token
        require(msg.value >= offer.currencyAmount, "Payment less than cost");
      }

      if (_merchantCanMint(address(offer.itemsCollection))) {
        offer.itemsCollection.mintBatchToAddress(_msgSender(), offer.itemIds, offer.itemAmounts);
      } else {
        offer.itemsCollection.safeBatchTransferFrom(address(this), _msgSender(), offer.itemIds, offer.itemAmounts, "");
      }

      emit Buy(_itemOfferId, offer, _msgSender());
    }

    // SELL OFFERS
    if (offer.offerType == ItemOfferType.SELLABLE) {
      offer.itemsCollection.safeBatchTransferFrom(_msgSender(), address(this), offer.itemIds, offer.itemAmounts, "");

      if (address(offer.currency) != address(0)) { // erc20
        if (_merchantCanMint(address(offer.currency))) {
          IERC20_Game_Currency gameCurrency = IERC20_Game_Currency(address(offer.currency));
          gameCurrency.mint(_msgSender(), offer.currencyAmount);
        } else { // native token
          offer.currency.transfer(_msgSender(), offer.currencyAmount);
        }
      } else {
        revert("Payable sell offers not enabled.");
        //payable(_msgSender()).transfer(offer.currencyAmount);
      }

      emit Sell(_itemOfferId, offer, _msgSender());
    }

    offer.uses++;
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
      interfaceId == type(IGame_Items_Merchant).interfaceId ||
      interfaceId == type(IERC1155Receiver).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  /**
   * @dev Helpers
   */

  function _merchantCanMint(address _contractAddress) private view returns (bool) {
    IAccessControl accessControlCheck = IAccessControl(_contractAddress);

    return accessControlCheck.hasRole(MINTER_ROLE, address(this));
  }
}
