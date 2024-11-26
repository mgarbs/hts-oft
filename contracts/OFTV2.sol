// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@layerzerolabs/solidity-examples/contracts/token/oft/v2/OFTV2.sol";

contract MyOFTV2 is OFTV2 {
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _sharedDecimals,
        address _lzEndpoint
    ) OFTV2(_name, _symbol, _sharedDecimals, _lzEndpoint) {}
}