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
import "./IGame_Items_Merchant.sol";
import "../Currency/IERC20_Game_Currency.sol";
import "../common/ERC2771Context_Upgradeable.sol";
import "../common/Roles.sol";

contract Game_Items_Merchant is IGame_Items_Merchant, ERC2771Context_Upgradeable, Roles, AccessControl, ReentrancyGuard, ERC1155Holder {
  enum ItemOfferType { BUYABLE, SELLABLE }

  bytes32[] public buyableItemOfferIds; // array of itemOfferIds
  mapping(bytes32 => ItemOffer) private buyableItemOffers; // itemOfferId => ItemOffer

  bytes32[] public sellableItemOfferIds; // array of itemOfferIds
  mapping(bytes32 => ItemOffer) private sellableItemOffers; // itemOfferId => ItemOffer

  constructor(address _forwarder)
  ERC2771Context_Upgradeable(_forwarder) {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(OWNER_ROLE, _msgSender());
  }

  /*
   * @dev Buyable offers
   */

  function allBuyableItemOfferIds() external view returns (bytes32[] memory) {
    return buyableItemOfferIds;
  }

  function getBuyableItemOffer(bytes32 _itemOfferId) external view returns (ItemOffer memory) {
    return buyableItemOffers[_itemOfferId];
  }

  function paginateBuyableItemOffers(uint256 _startIndexInclusive, uint256 _limit) external view returns (ItemOffer[] memory) {
    uint256 totalPaginatable = _startIndexInclusive < buyableItemOfferIds.length ? buyableItemOfferIds.length - _startIndexInclusive : 0;
    uint256 totalPaginate = totalPaginatable <= _limit ? totalPaginatable : _limit;
    ItemOffer[] memory itemOffers = new ItemOffer[](totalPaginate);

    for (uint256 i = 0; i < totalPaginate; i++) {
      itemOffers[i] = buyableItemOffers[buyableItemOfferIds[_startIndexInclusive + i]];
    }

    return itemOffers;
  }

  function totalBuyableItemOffers() external view returns (uint256) {
    return buyableItemOfferIds.length;
  }

  function setBuyableItemOffer(address _itemsAddress, uint256[] calldata _itemIds, uint256[] calldata _itemAmounts, address _currencyAddress, uint256 _currencyAmount, uint256 _maxUses) external onlyRole(OWNER_ROLE) {
    _setItemOffer(ItemOfferType.BUYABLE, _itemsAddress, _itemIds, _itemAmounts, _currencyAddress, _currencyAmount, _maxUses);
  }

  function removeBuyableItemOffer(bytes32 _itemOfferId) external onlyRole(OWNER_ROLE) {
    buyableItemOffers[_itemOfferId].isActive = false;
  }

  /*
   * Sellable offers
   */

  function allSellableItemOfferIds() external view returns (bytes32[] memory) {
    return sellableItemOfferIds;
  }

  function getSellableItemOffer(bytes32 _itemOfferId) external view returns (ItemOffer memory) {
    return sellableItemOffers[_itemOfferId];
  }

  function paginateSellableItemOffers(uint256 _startIndexInclusive, uint256 _limit) external view returns (ItemOffer[] memory) {
    uint256 totalPaginatable = _startIndexInclusive < sellableItemOfferIds.length ? sellableItemOfferIds.length - _startIndexInclusive : 0;
    uint256 totalPaginate = totalPaginatable <= _limit ? totalPaginatable : _limit;
    ItemOffer[] memory itemOffers = new ItemOffer[](totalPaginate);

    for (uint256 i = 0; i < totalPaginate; i++) {
      itemOffers[i] = sellableItemOffers[sellableItemOfferIds[_startIndexInclusive + i]];
    }

    return itemOffers;
  }

  function totalSellableItemOffers() external view returns (uint256) {
    return sellableItemOfferIds.length;
  }

  function setSellableItemOffer(address _itemsAddress, uint256[] calldata _itemIds, uint256[] calldata _itemAmounts, address _currencyAddress, uint256 _currencyAmount, uint256 _maxUses) external onlyRole(OWNER_ROLE) {
    _setItemOffer(ItemOfferType.SELLABLE, _itemsAddress, _itemIds, _itemAmounts, _currencyAddress, _currencyAmount, _maxUses);
  }

  function removeSellableItemOffer(bytes32 _itemOfferId) external onlyRole(OWNER_ROLE)  {
    sellableItemOffers[_itemOfferId].isActive = false;
  }

  /*
   * @dev Offer IDs
   */

  function generateItemOfferId(address _itemsAddress, address _currencyAddress, uint256[] calldata _itemIds) public pure returns(bytes32) {
    return keccak256(abi.encodePacked(_itemsAddress, _currencyAddress, _itemIds));
  }

  /*
   * @dev Buy/sell
   */

  function buy(bytes32 _itemOfferId) external payable canUseItemOffer(ItemOfferType.BUYABLE, _itemOfferId) nonReentrant {
    require(_itemOfferIsActive(ItemOfferType.BUYABLE, _itemOfferId), "itemOfferId is not a valid buyable offer.");

    ItemOffer storage itemOffer = buyableItemOffers[_itemOfferId];

    if (address(itemOffer.currency) != address(0)) { // erc20
      itemOffer.currency.transferFrom(_msgSender(), address(this), itemOffer.currencyAmount);
    } else { // native token
      require(msg.value >= itemOffer.currencyAmount, "Payment less than cost");
    }

    if (_merchantCanMint(address(itemOffer.items))) {
      itemOffer.items.mintBatchToAddress(_msgSender(), itemOffer.itemIds, itemOffer.itemAmounts);
    } else {
      itemOffer.items.safeBatchTransferFrom(address(this), _msgSender(), itemOffer.itemIds, itemOffer.itemAmounts, "");
    }

    itemOffer.uses++;
  }

  function sell(bytes32 _itemOfferId) external canUseItemOffer(ItemOfferType.SELLABLE, _itemOfferId) nonReentrant {
    require(_itemOfferIsActive(ItemOfferType.SELLABLE, _itemOfferId), "itemOfferId is not a valid sellable offer.");

    ItemOffer storage itemOffer = sellableItemOffers[_itemOfferId];

    itemOffer.items.safeBatchTransferFrom(_msgSender(), address(this), itemOffer.itemIds, itemOffer.itemAmounts, "");

    if (address(itemOffer.currency) != address(0)) { // erc20
      if (_merchantCanMint(address(itemOffer.currency))) {
        IERC20_Game_Currency gameCurrency = IERC20_Game_Currency(address(itemOffer.currency));
        gameCurrency.mint(_msgSender(), itemOffer.currencyAmount);
      } else { // native token
        itemOffer.currency.transfer(_msgSender(), itemOffer.currencyAmount);
      }
    } else {
      payable(_msgSender()).transfer(itemOffer.currencyAmount);
    }

    itemOffer.uses++;
  }

  /*
   * @dev Withdrawals
   */

  function withdraw() external onlyRole(OWNER_ROLE) {
    payable(_msgSender()).transfer(address(this).balance);
  }

  function withdrawCurrency(address _currencyAddress) external onlyRole(OWNER_ROLE) {
    IERC20 currency = IERC20(_currencyAddress);

    currency.transfer(_msgSender(), currency.balanceOf(_msgSender()));
  }

  function withdrawItems(address _itemsAddress, uint256[] calldata _itemIds) external onlyRole(OWNER_ROLE) {
    IERC1155 items = IERC1155(_itemsAddress);
    uint256[] memory itemBalances = new uint256[](_itemIds.length);

    for (uint256 i = 0; i < _itemIds.length; i++) {
      itemBalances[i] = items.balanceOf(address(this), _itemIds[i]);
    }

    items.safeBatchTransferFrom(address(this), _msgSender(), _itemIds, itemBalances, "");
  }

  /*
   * @dev Deposits
   */

  receive() external payable {}

  /*
   * @dev Private helpers
   */

  function _setItemOffer(ItemOfferType _type, address _itemsAddress, uint256[] calldata _itemIds, uint256[] calldata _itemAmounts, address _currencyAddress, uint256 _currencyAmount, uint256 _maxUses) private {
    IERC1155_Game_Items items = IERC1155_Game_Items(_itemsAddress);
    IERC20 currency = IERC20(_currencyAddress);

    require(items.supportsInterface(type(IERC1155_Game_Items).interfaceId), "Invalid items contract");

    bytes32 itemOfferId = generateItemOfferId(_itemsAddress, _currencyAddress, _itemIds);
    uint256 existingUses = _type == ItemOfferType.BUYABLE
      ? buyableItemOffers[itemOfferId].uses
      : sellableItemOffers[itemOfferId].uses;

    ItemOffer memory itemOffer = ItemOffer({
      isActive: true,
      itemIds: _itemIds,
      itemAmounts: _itemAmounts,
      currencyAmount: _currencyAmount,
      uses: existingUses,
      maxUses: _maxUses,
      items: items,
      currency: currency
    });

    if (!_itemOfferExists(_type, itemOfferId)) {
      _type == ItemOfferType.BUYABLE
        ? buyableItemOfferIds.push(itemOfferId)
        : sellableItemOfferIds.push(itemOfferId);
    }

    _type == ItemOfferType.BUYABLE
      ? buyableItemOffers[itemOfferId] = itemOffer
      : sellableItemOffers[itemOfferId] = itemOffer;
  }

  function _itemOfferExists(ItemOfferType _type, bytes32 _itemOfferId) private view returns (bool) {
    return _type == ItemOfferType.BUYABLE
      ? address(buyableItemOffers[_itemOfferId].items) != address(0)
      : address(sellableItemOffers[_itemOfferId].items) != address(0);
  }

  function _itemOfferIsActive(ItemOfferType _type, bytes32 _itemOfferId) private view returns (bool) {
    return _type == ItemOfferType.BUYABLE
      ? buyableItemOffers[_itemOfferId].isActive
      : sellableItemOffers[_itemOfferId].isActive;
  }

  function _merchantCanMint(address _contractAddress) private view returns (bool) {
    IAccessControl accessControlCheck = IAccessControl(_contractAddress);

    return accessControlCheck.hasRole(MINTER_ROLE, address(this));
  }

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
   * @dev Modifiers
   */

  modifier canUseItemOffer(ItemOfferType _type, bytes32 _itemOfferId) {
    ItemOffer storage itemOffer = _type == ItemOfferType.BUYABLE
      ? buyableItemOffers[_itemOfferId]
      : sellableItemOffers[_itemOfferId];

    require(itemOffer.maxUses == 0 || itemOffer.uses < itemOffer.maxUses, "Offer has reached max uses.");
    _;
  }
}
