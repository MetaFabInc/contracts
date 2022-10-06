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
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../Items/IERC1155_Game_Items.sol";
import "../Currency/IERC20_Game_Currency.sol";
import "../common/ERC2771Context_Upgradeable.sol";
import "./IGame_Items_Merchant.sol";

contract Game_Items_Merchant is IGame_Items_Merchant, ERC2771Context_Upgradeable, AccessControl, ReentrancyGuard {
  enum ItemOfferType { BUYABLE, SELLABLE }

  bytes32 private constant OWNER_ROLE = keccak256("OWNER_ROLE");

  struct ItemOffer {
    uint256 itemId;
    uint256 currencyAmount;
    bool exists;
    bool isActive;
    bool isGameCurrency;
    bool isNativeCurrency;
    IERC1155_Game_Items items;
    IERC20 erc20Currency;
    IERC20_Game_Currency erc20GameCurrency;
  }

  bytes32[] public buyableItemOfferIds; // array of itemOfferIds
  mapping(bytes32 => ItemOffer) public buyableItemOffers; // itemOfferId => ItemOffer

  bytes32[] public sellableItemOfferIds; // array of itemOfferIds
  mapping(bytes32 => ItemOffer) public sellableItemOffers; // itemOfferId => ItemOffer

  constructor(address _forwarder)
  ERC2771Context_Upgradeable(_forwarder) {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(OWNER_ROLE, _msgSender());
  }

  function setBuyableItemOffer(address _itemsAddress, uint256 _itemId, address _currencyAddress, uint256 _currencyAmount) external onlyRole(OWNER_ROLE) {
    _setItemOffer(ItemOfferType.BUYABLE, _itemsAddress, _currencyAddress, _itemId, _currencyAmount);
  }

  function removeBuyableItemOffer(bytes32 _itemOfferId) external onlyRole(OWNER_ROLE) {
    buyableItemOffers[_itemOfferId].isActive = false;
  }

  function setSellableItemOffer(address _itemsAddress, uint256 _itemId, address _currencyAddress, uint256 _currencyAmount) external onlyRole(OWNER_ROLE) {
    _setItemOffer(ItemOfferType.SELLABLE, _itemsAddress, _currencyAddress, _itemId, _currencyAmount);
  }

  function removeSellableItemOffer(bytes32 _itemOfferId) external onlyRole(OWNER_ROLE)  {
    sellableItemOffers[_itemOfferId].isActive = false;
  }

  function generateItemOfferId(address _itemsAddress, address _currencyAddress, uint256 _itemId) public pure returns(bytes32) {
    return keccak256(abi.encodePacked(_itemsAddress, _currencyAddress, _itemId));
  }

  function totalBuyableItemOffers() external view returns (uint256) {
    return buyableItemOfferIds.length;
  }

  function totalSellableItemOffers() external view returns (uint256) {
    return sellableItemOfferIds.length;
  }

  function purchase(bytes32 _itemOfferId) external payable nonReentrant {

  }

  function sell(bytes32 _itemOfferId) external nonReentrant {

  }

  /*
   * @dev Private helpers
   */

  function _setItemOffer(ItemOfferType _type, address _itemsAddress, address _currencyAddress, uint256 _itemId, uint256 _currencyAmount) private {
    IERC1155_Game_Items items = IERC1155_Game_Items(_itemsAddress);
    IERC20 erc20Currency = IERC20(_currencyAddress);
    IERC20_Game_Currency erc20GameCurrency = IERC20_Game_Currency(_currencyAddress);

    require(items.supportsInterface(type(IERC1155_Game_Items).interfaceId), "Invalid items contract");

    bytes32 itemOfferId = generateItemOfferId(_itemsAddress, _currencyAddress, _itemId);
    bool isGameCurrency = erc20GameCurrency.supportsInterface(type(IERC20_Game_Currency).interfaceId);

    ItemOffer memory itemOffer = ItemOffer({
      itemId: _itemId,
      currencyAmount: _currencyAmount,
      exists: true,
      isActive: true,
      isGameCurrency: isGameCurrency,
      isNativeCurrency: _currencyAddress == address(0),
      items: items,
      erc20Currency: erc20Currency,
      erc20GameCurrency: erc20GameCurrency
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
      ? buyableItemOffers[_itemOfferId].exists
      : sellableItemOffers[_itemOfferId].exists;
  }

  function _itemOfferIsActive(ItemOfferType _type, bytes32 _itemOfferId) private view returns (bool) {
    return _type == ItemOfferType.BUYABLE
      ? buyableItemOffers[_itemOfferId].isActive
      : sellableItemOffers[_itemOfferId].isActive;
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

  function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl) returns (bool) {
    return interfaceId == type(IGame_Items_Merchant).interfaceId || super.supportsInterface(interfaceId);
  }
}
