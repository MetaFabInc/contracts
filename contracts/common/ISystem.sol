// SPDX-License-Identifier: Commons-Clause-1.0
//  __  __     _        ___     _
// |  \/  |___| |_ __ _| __|_ _| |__
// | |\/| / -_)  _/ _` | _/ _` | '_ \
// |_|  |_\___|\__\__,_|_|\__,_|_.__/
//
// Launch your crypto game or gamefi project's blockchain
// infrastructure & game APIs fast with https://trymetafab.com

pragma solidity ^0.8.16;

interface ISystem {
  function addSystemId(bytes32 _systemId) external;
  function removeSystemId(bytes32 _systemId) external;
  function systemId() external view returns (bytes32); // legacy, initialized systemId
  function supportsSystemId(bytes32 _systemId) external view returns (bool);
  function supportedSystemIds() external view returns (bytes32[] memory);
}
