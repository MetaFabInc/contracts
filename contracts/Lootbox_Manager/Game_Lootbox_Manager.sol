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
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./IGame_Lootbox_Manager.sol";
import "../Currency/IERC20_Game_Currency.sol";
import "../Items_Collection/IERC1155_Game_Items_Collection.sol";
import "../common/ERC2771Context_Upgradeable.sol";
import "../common/Roles.sol";
import "../common/System.sol";

contract Game_Lootbox_Manager is IGame_Lootbox_Manager, ERC2771Context_Upgradeable, ERC1155Holder, Roles, System, AccessControl, ReentrancyGuard {
  using EnumerableSet for EnumerableSet.UintSet;

  EnumerableSet.UintSet private lootboxIds;
  mapping(uint256 => Lootbox) private lootboxes;
  mapping(address => mapping(uint256 => OpenedLootbox[])) private openedLootboxes; // addr -> lootboxId -> OpenedLootbox[]
  uint256 claimableBlockOffset = 1;

  constructor(address _forwarder, bytes32 _systemId)
  ERC2771Context_Upgradeable(_forwarder)
  System(_systemId) {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(MANAGER_ROLE, _msgSender());
  }

  /**
   * @dev Lootbox data retrieval
   */

  function allLootboxIds() external view returns (uint256[] memory) {
    return lootboxIds.values();
  }

  function allLootboxes() external view returns (Lootbox[] memory) {
    Lootbox[] memory lootboxesResult = new Lootbox[](totalLootboxes());

    for (uint256 i = 0; i < totalLootboxes(); i++) {
      lootboxesResult[i] = lootboxes[lootboxIds.at(i)];
    }

    return lootboxesResult;
  }

  function allOpenedLootboxes(address _address, uint256 _lootboxId) external view returns (OpenedLootbox[] memory) {
    return openedLootboxes[_address][_lootboxId];
  }

  function allLootboxLastUpdates() external view returns (uint256[][] memory) {
    uint256[][] memory lootboxLastUpdates = new uint256[][](totalLootboxes());

    for (uint256 i = 0; i < totalLootboxes(); i++) {
      lootboxLastUpdates[i] = lootboxLastUpdate(lootboxIds.at(i));
    }

    return lootboxLastUpdates;
  }

  function paginateLootboxIds(uint256 _startIndexInclusive, uint256 _limit) external view returns(uint256[] memory) {
    uint256 totalPaginatable = _startIndexInclusive < lootboxIds.length() ? lootboxIds.length() - _startIndexInclusive : 0;
    uint256 totalPaginate = totalPaginatable <= _limit ? totalPaginatable : _limit;

    uint256[] memory paginatedLootboxIds = new uint256[](totalPaginate);

    for (uint256 i = 0; i < totalPaginate; i++) {
      paginatedLootboxIds[i] = lootboxIds.at(_startIndexInclusive + i);
    }

    return paginatedLootboxIds;
  }

  function paginateLootboxes(uint256 _startIndexInclusive, uint256 _limit) external view returns(Lootbox[] memory) {
    uint256 totalPaginatable = _startIndexInclusive < lootboxIds.length() ? lootboxIds.length() - _startIndexInclusive : 0;
    uint256 totalPaginate = totalPaginatable <= _limit ? totalPaginatable : _limit;

    Lootbox[] memory paginatedLootboxes = new Lootbox[](totalPaginate);

    for (uint256 i = 0; i < totalPaginate; i++) {
      paginatedLootboxes[i] = lootboxes[lootboxIds.at(_startIndexInclusive + i)];
    }

    return paginatedLootboxes;
  }

  function paginateOpenedLootboxes(address _address, uint256 _lootboxId, uint256 _startIndexInclusive, uint256 _limit) external view returns (OpenedLootbox[] memory) {
    uint256 totalPaginatable = _startIndexInclusive < totalOpenedLootboxes(_address, _lootboxId) ? totalOpenedLootboxes(_address, _lootboxId) - _startIndexInclusive : 0;
    uint256 totalPaginate = totalPaginatable <= _limit ? totalPaginatable : _limit;

    OpenedLootbox[] memory paginatedOpenedLootboxes = new OpenedLootbox[](totalPaginate);

    for (uint256 i = 0; i < totalPaginate; i++) {
      paginatedOpenedLootboxes[i] = openedLootboxes[_address][_lootboxId][_startIndexInclusive + i];
    }

    return paginatedOpenedLootboxes;
  }

  function paginateLootboxLastUpdates(uint256 _startIndexInclusive, uint256 _limit) external view returns(uint256[][] memory) {
    uint256 totalPaginatable = _startIndexInclusive < lootboxIds.length() ? lootboxIds.length() - _startIndexInclusive : 0;
    uint256 totalPaginate = totalPaginatable <= _limit ? totalPaginatable : _limit;

    uint256[][] memory paginatedLootboxLastUpdates = new uint256[][](totalPaginate);

    for(uint256 i = 0; i < totalPaginate; i++) {
      paginatedLootboxLastUpdates[i] = lootboxLastUpdate(lootboxIds.at(_startIndexInclusive + i));
    }

    return paginatedLootboxLastUpdates;
  }

  function lootboxId(uint256 _index) external view returns (uint256) {
    require(_index < lootboxIds.length(), "Index out of bounds");

    return lootboxIds.at(_index);
  }

  function lootbox(uint256 _lootboxId) external view returns (Lootbox memory) {
    require(lootboxIds.contains(_lootboxId), "lootboxId does not exist or has been removed.");

    return lootboxes[_lootboxId];
  }

  function openedLootbox(address _address, uint256 _lootboxId, uint256 _openedLootboxIndex) external view returns (OpenedLootbox memory) {
    require(_openedLootboxIndex < totalOpenedLootboxes(_address, _lootboxId), "openedLootboxIndex does not exists.");

    return openedLootboxes[_address][_lootboxId][_openedLootboxIndex];
  }

  function lootboxLastUpdate(uint256 _lootboxId) public view returns (uint256[] memory) {
    uint256[] memory lootboxLastUpdateResult = new uint256[](2);

    lootboxLastUpdateResult[0] = _lootboxId;
    lootboxLastUpdateResult[1] = lootboxes[_lootboxId].lastUpdatedAt;

    return lootboxLastUpdateResult;
  }

  function totalLootboxes() public view returns (uint256) {
    return lootboxIds.length();
  }

  function totalOpenedLootboxes(address _address, uint256 _lootboxId) public view returns (uint256) {
    return openedLootboxes[_address][_lootboxId].length;
  }

  function totalClaimableLootboxes(address _address, uint256 _lootboxId) external view returns (uint256) {
    uint256 claimable = 0;

    for (uint256 i = 0; i < totalOpenedLootboxes(_address, _lootboxId); i++) {
      OpenedLootbox storage lootboxOpened = openedLootboxes[_address][_lootboxId][i];

      if (block.number >= lootboxOpened.claimSeedBlock && !lootboxOpened.claimed) {
        claimable++;
      }
    }

    return claimable;
  }

  /**
   * @dev Management
   */

  function setLootbox(
    uint256 _lootboxId,
    address[2] calldata _inputOutputCollections,              // 0: inputItemsCollection, 1: outputItemsCollection
    uint256[][2] calldata _inputOutputCollectionItemIds,      // 0: inputItemIds, 1: outputItemIds
    uint256[][2] calldata _inputOutputCollectionItemAmounts,  // 0: inputItemAmounts, 1: outputItemAmounts
    uint256[] calldata _outputCollectionItemWeights,
    uint256 _outputTotalItems
  ) external onlyRole(MANAGER_ROLE) {
    require(_inputOutputCollectionItemIds[0].length == _inputOutputCollectionItemAmounts[0].length, "Mismatched input item ids and amount lengths.");
    require(_inputOutputCollectionItemIds[1].length == _inputOutputCollectionItemAmounts[1].length, "Mismatched output item ids and amount length.");
    require(_inputOutputCollectionItemIds[1].length == _outputCollectionItemWeights.length, "Mismatch output item ids and item weights length.");

    uint256 outputTotalItemsWeight = 0;
    for (uint256 i = 0; i < _outputCollectionItemWeights.length; i++) {
      outputTotalItemsWeight += _outputCollectionItemWeights[i];
    }

    Lootbox memory lootboxSet = Lootbox({
      id: _lootboxId,
      inputCollection: IERC1155(_inputOutputCollections[0]),
      inputCollectionItemIds: _inputOutputCollectionItemIds[0],
      inputCollectionItemAmounts: _inputOutputCollectionItemAmounts[0],
      outputCollection: IERC1155(_inputOutputCollections[1]),
      outputCollectionItemIds: _inputOutputCollectionItemIds[1],
      outputCollectionItemAmounts: _inputOutputCollectionItemAmounts[1],
      outputCollectionItemWeights: _outputCollectionItemWeights,
      outputTotalItemsWeight: outputTotalItemsWeight,
      outputTotalItems: _outputTotalItems,
      opens: lootboxes[_lootboxId].opens,
      lastUpdatedAt: block.timestamp
    });

    lootboxIds.add(_lootboxId);
    lootboxes[_lootboxId] = lootboxSet;

    emit LootboxSet(_lootboxId, lootboxSet);
  }

  function removeLootbox(uint256 _lootboxId) external onlyRole(MANAGER_ROLE) {
    lootboxIds.remove(_lootboxId);

    Lootbox storage lootboxRemoved = lootboxes[_lootboxId];

    emit LootboxRemoved(_lootboxId, lootboxRemoved);

    lootboxRemoved.opens = 0;
  }

  function openLootbox(uint256 _lootboxId) external nonReentrant {
    require(lootboxIds.contains(_lootboxId), "lootboxId does not exist or has been removed.");

    Lootbox storage lootboxOpened = lootboxes[_lootboxId];

    if (address(lootboxOpened.inputCollection) != address(0)) {
      if (lootboxOpened.inputCollection.supportsInterface(type(IERC1155_Game_Items_Collection).interfaceId)) {
        IERC1155_Game_Items_Collection(address(lootboxOpened.inputCollection)).burnBatchFromAddress(
          _msgSender(),
          lootboxOpened.inputCollectionItemIds,
          lootboxOpened.inputCollectionItemAmounts
        );
      } else {
        lootboxOpened.inputCollection.safeBatchTransferFrom(
          _msgSender(),
          address(this),
          lootboxOpened.inputCollectionItemIds,
          lootboxOpened.inputCollectionItemAmounts,
          ""
        );
      }
    }

    OpenedLootbox memory lootboxOpenedEntry;
    lootboxOpenedEntry.lootboxId = _lootboxId;
    lootboxOpenedEntry.claimSeedBlock = block.number + claimableBlockOffset;
    openedLootboxes[_msgSender()][_lootboxId].push(lootboxOpenedEntry);

    lootboxOpened.opens++;

    emit LootboxOpened(_lootboxId, lootboxOpened, _msgSender());
  }

  function claimLootbox(uint256 _lootboxId, uint256 _openedLootboxIndex) external nonReentrant {
    _claimLootbox(_lootboxId, _openedLootboxIndex, true);
  }

  function claimLootboxes(uint256 _lootboxId) external nonReentrant {
    for (uint256 i = 0; i < openedLootboxes[_msgSender()][_lootboxId].length; i++) {
      _claimLootbox(_lootboxId, i, false);
    }
  }

  function _claimLootbox(uint256 _lootboxId, uint256 _openedLootboxIndex, bool _revertUnclaimable) private {
    OpenedLootbox storage lootboxOpened = openedLootboxes[_msgSender()][_lootboxId][_openedLootboxIndex];
    Lootbox storage lootboxClaimed = lootboxes[_lootboxId];

    if (block.number < lootboxOpened.claimSeedBlock || lootboxOpened.claimed) {
      if (_revertUnclaimable) {
        revert("Lootbox unclaimable. Claim block not reached or already claimed.");
      } else {
        return;
      }
    }

    // Pick randomized items
    uint256[] memory outputCollectionItemIds = new uint256[](lootboxClaimed.outputTotalItems);
    uint256[] memory outputCollectionItemAmounts = new uint256[](lootboxClaimed.outputTotalItems);

    for (uint256 i = 0; i < lootboxClaimed.outputTotalItems; i++) {
      uint256 randomSeed = uint256(keccak256(abi.encodePacked(blockhash(lootboxOpened.claimSeedBlock - 1), _msgSender(), _openedLootboxIndex, i)));
      uint256 randomWeight = randomSeed % lootboxClaimed.outputTotalItemsWeight;

      for (uint256 j = 0; j < lootboxClaimed.outputCollectionItemWeights.length; j++) {
        uint256 indexWeight = lootboxClaimed.outputCollectionItemWeights[j];

        if (indexWeight > randomWeight) {
          outputCollectionItemIds[i] = lootboxClaimed.outputCollectionItemIds[j];
          outputCollectionItemAmounts[i] = lootboxClaimed.outputCollectionItemAmounts[j];
          break;
        }

        randomWeight -= indexWeight;
      }
    }

    // Mint or transfer picked items
    if (IAccessControl(address(lootboxClaimed.outputCollection)).hasRole(MINTER_ROLE, address(this))) {
      IERC1155_Game_Items_Collection(address(lootboxClaimed.outputCollection)).mintBatchToAddress(
        _msgSender(),
        outputCollectionItemIds,
        outputCollectionItemAmounts
      );
    } else {
      lootboxClaimed.outputCollection.safeBatchTransferFrom(
        address(this),
        _msgSender(),
        outputCollectionItemIds,
        outputCollectionItemAmounts,
        ""
      );
    }

    lootboxOpened.outputCollectionItemIds = outputCollectionItemIds;
    lootboxOpened.outputCollectionItemAmounts = outputCollectionItemAmounts;
    lootboxOpened.claimed = true;

    emit LootboxClaimed(_lootboxId, lootboxClaimed, _msgSender(), _openedLootboxIndex, outputCollectionItemIds, outputCollectionItemAmounts);
  }

  /**
   * @dev Randomization block difficulty, setting this to a higher number requires more blocks
   * to pass before an opened lootbox can be claimed. The default value of 1 should be sufficient
   * for most implementations.
   */

  function setClaimableBlockOffset(uint256 _offset) external onlyRole(MANAGER_ROLE) {
    require(_offset > 0, "Offset cannot be 0");
    claimableBlockOffset = _offset;
  }

  /**
   * @dev Support for gasless transactions
   */

  function upgradeTrustedForwarder(address _newTrustedForwarder) external onlyRole(MANAGER_ROLE) {
    _upgradeTrustedForwarder(_newTrustedForwarder);
  }

  function _msgSender() internal view override(Context, ERC2771Context_Upgradeable) returns (address) {
    return super._msgSender();
  }

  function _msgData() internal view override(Context, ERC2771Context_Upgradeable) returns (bytes calldata) {
    return super._msgData();
  }

  /**
   * @dev Support for roles & control
   */

  function grantRole(bytes32 _role, address _account) public virtual override {
    bool isAdmin = hasRole(DEFAULT_ADMIN_ROLE, _msgSender());
    bool isManager = hasRole(MANAGER_ROLE, _msgSender());

    require(isAdmin || isManager, "Role granting requires admin or manager role.");

    if (_role == DEFAULT_ADMIN_ROLE || _role == MANAGER_ROLE) {
      require(isAdmin, "Only admin can grant admin or manager role.");
    }

    _grantRole(_role, _account);
  }

  function transferOwnershipControl(address _newOwner) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _grantRole(DEFAULT_ADMIN_ROLE, _newOwner);
    _revokeRole(DEFAULT_ADMIN_ROLE, _msgSender());
  }

  /**
   * @dev ERC165
   */

  function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, ERC1155Receiver) returns (bool) {
    return
      interfaceId == type(IGame_Lootbox_Manager).interfaceId ||
      interfaceId == type(IERC1155Receiver).interfaceId ||
      super.supportsInterface(interfaceId);
  }
}
