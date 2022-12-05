// SPDX-License-Identifier: Commons-Clause-1.0
//  __  __     _        ___     _
// |  \/  |___| |_ __ _| __|_ _| |__
// | |\/| / -_)  _/ _` | _/ _` | '_ \
// |_|  |_\___|\__\__,_|_|\__,_|_.__/
//
// Launch your crypto game or gamefi project's blockchain
// infrastructure & game APIs fast with https://trymetafab.com

pragma solidity ^0.8.16;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "./ISystem.sol";

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

  // mapping from account to gasless tx nonces to prevent replay
  mapping(address => mapping(uint256 => bool)) private _nonces;

  // mapping from account address -> system id -> delegate signer address approvals
  mapping(address => mapping(bytes32 => mapping(address => bool))) private _systemDelegateApprovals;

  constructor() EIP712("ERC2771_Trusted_Forwarder", "1.0.0") {}

  function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool) {
    address signer = _hashTypedDataV4(
      keccak256(abi.encode(_TYPEHASH, req.from, req.to, req.value, req.gas, req.nonce, keccak256(req.data)))
    ).recover(signature);

    return !_nonces[req.from][req.nonce] && (signer == req.from || isDelegateApprovedForSystem(req.from, ISystem(req.to).systemId(), signer));
  }

  function execute(ForwardRequest calldata req, bytes calldata signature) public payable returns (bool, bytes memory) {
    require(verify(req, signature), "ERC2771_Trusted_Forwarder: signature does not match request, signer is not approved for system, or nonce has been used");

    _nonces[req.from][req.nonce] = true;

    (bool success, bytes memory returndata) = req.to.call{gas: req.gas, value: req.value}(
      abi.encodePacked(req.data, req.from)
    );

    // Validate that the relayer has sent enough gas for the call.
    // See https://ronan.eth.link/blog/ethereum-gas-dangers/
    assert(gasleft() > req.gas / 63);

    return (success, returndata);
  }

  function isDelegateApprovedForSystem(address account, bytes32 systemId, address delegate) public view returns (bool) {
    return _systemDelegateApprovals[account][systemId][delegate];
  }

  function setDelegateApprovalForSystem(bytes32 systemId, address delegate, bool approved) external {
    _systemDelegateApprovals[msg.sender][systemId][delegate] = approved;
  }

  function setDelegateApprovalForSystemBySignature(bytes32 systemId, address delegate, bool approved, address signer, uint256 nonce, bytes calldata signature) external {
    address recoveredSigner = keccak256(abi.encode(systemId, delegate, approved, signer, nonce)).toEthSignedMessageHash().recover(signature);
    require(signer == recoveredSigner, "Signer recovered from signature mismatched signer");
    require(!_nonces[signer][nonce], "nonce has been used");

    _nonces[signer][nonce] = true;
    _systemDelegateApprovals[signer][systemId][delegate] = approved;
  }
}
