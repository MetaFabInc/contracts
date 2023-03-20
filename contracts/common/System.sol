// SPDX-License-Identifier: Commons-Clause-1.0
//  __  __     _        ___     _
// |  \/  |___| |_ __ _| __|_ _| |__
// | |\/| / -_)  _/ _` | _/ _` | '_ \
// |_|  |_\___|\__\__,_|_|\__,_|_.__/
//
// Launch your crypto game or gamefi project's blockchain
// infrastructure & game APIs fast with https://trymetafab.com

pragma solidity ^0.8.16;

import "./ISystem.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

abstract contract System is ISystem {
  using EnumerableSet for EnumerableSet.Bytes32Set;
  EnumerableSet.Bytes32Set private systemIds;
  bytes32 private initializedSystemId;

  constructor(bytes32 _systemId) {
    systemIds.add(_systemId);
    initializedSystemId = _systemId;
  }

  function addSystemId(bytes32 _systemId) external {
    systemIds.add(_systemId);
  }

  function removeSystemId(bytes32 _systemId) external {
    systemIds.remove(_systemId);
  }

  function systemId() public view returns (bytes32) { // returns the initialized systemId (legacy)
    return initializedSystemId;
  }

  function supportsSystemId(bytes32 _systemId) public view returns (bool) {
    return systemIds.contains(_systemId);
  }

  function supportedSystemIds() public view returns (bytes32[] memory) {
    return systemIds.values();
  }
}
