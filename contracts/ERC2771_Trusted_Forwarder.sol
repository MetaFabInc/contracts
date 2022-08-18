// SPDX-License-Identifier: Commons-Clause-1.0
//                      _   _
//    /\/\   __ _ _ __ | |_| | ___
//   /    \ / _` | '_ \| __| |/ _ \
//  / /\/\ \ (_| | | | | |_| |  __/
//  \/    \/\__,_|_| |_|\__|_|\___|
//
// Launch your crypto game or gamefi project's blockchain
// infrastructure & game APIs fast with https://mantle.gg

pragma solidity ^0.8.16;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

contract ERC2771_Trusted_Forwarder is EIP712 {
  using ECDSA for bytes32;

  struct ForwardRequest {
    address from;
    address to;
    uint256 value;
    uint256 gas;
    uint256 nonce;
    bytes data;
  }

  bytes32 private constant _TYPEHASH =
    keccak256("ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)");

  mapping(address => mapping(uint256 => bool)) private _nonces;

  constructor() EIP712("WRLD_Forwarder_Polygon", "1.0.0") {}

  function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool) {
    address signer = _hashTypedDataV4(
      keccak256(abi.encode(_TYPEHASH, req.from, req.to, req.value, req.gas, req.nonce, keccak256(req.data)))
    ).recover(signature);

    return !_nonces[req.from][req.nonce] && signer == req.from;
  }

  function execute(ForwardRequest calldata req, bytes calldata signature) public payable returns (bool, bytes memory) {
    require(verify(req, signature), "WRLD_Forwarder_Polygon: signature does not match request");

    _nonces[req.from][req.nonce] = true;

    (bool success, bytes memory returndata) = req.to.call{gas: req.gas, value: req.value}(
      abi.encodePacked(req.data, req.from)
    );

    // Validate that the relayer has sent enough gas for the call.
    // See https://ronan.eth.link/blog/ethereum-gas-dangers/
    assert(gasleft() > req.gas / 63);

    return (success, returndata);
  }
}
