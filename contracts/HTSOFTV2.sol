// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@layerzerolabs/solidity-examples/contracts/token/oft/v2/BaseOFTV2.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./hts/HederaTokenService.sol";
import "./hts/IHederaTokenService.sol";
import "./hts/KeyHelper.sol";
import "./hts/ExpiryHelper.sol";

contract HTSOFTV2 is
    Ownable,
    KeyHelper,
    ExpiryHelper,
    HederaTokenService,
    BaseOFTV2
{
    address public htsToken;
    uint internal immutable ld2sdRate;
    event CreatedToken(address tokenAddress);
    event TokenInfo(IHederaTokenService.TokenInfo tokenInfo);

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _sharedDecimals,
        address _lzEndpoint
    ) payable BaseOFTV2(_sharedDecimals, _lzEndpoint) Ownable() {
        uint8 decimals = 8; // HTS tokens typically use 8 decimals
        require(
            _sharedDecimals <= decimals,
            "HTSOFT: sharedDecimals must be <= decimals"
        );
        ld2sdRate = 10 ** (decimals - _sharedDecimals);

        IHederaTokenService.TokenKey[]
            memory keys = new IHederaTokenService.TokenKey[](2);
        keys[0] = getSingleKey(
            KeyType.ADMIN,
            KeyType.PAUSE,
            KeyValueType.INHERIT_ACCOUNT_KEY,
            bytes("")
        );
        keys[1] = getSingleKey(
            KeyType.SUPPLY,
            KeyValueType.INHERIT_ACCOUNT_KEY,
            bytes("")
        );

        IHederaTokenService.Expiry memory expiry = IHederaTokenService.Expiry(
            0,
            address(this),
            8000000
        );

        IHederaTokenService.HederaToken memory token = IHederaTokenService
            .HederaToken(
                _name,
                _symbol,
                address(this),
                "memo",
                true,
                10,
                false,
                keys,
                expiry
            );

        (int responseCode, address tokenAddress) = HederaTokenService
            .createFungibleToken(token, 5, int32(int256(uint256(decimals))));

        require(
            responseCode == HederaResponseCodes.SUCCESS,
            "Failed to create HTS token"
        );
        htsToken = tokenAddress;
        emit CreatedToken(tokenAddress);
    }

    uint256 private _cachedCirculatingSupply;
    uint256 private _lastUpdateTime;
    uint256 private constant UPDATE_INTERVAL = 1 hours;

    function circulatingSupply() public view virtual override returns (uint) {
        return _cachedCirculatingSupply;
    }

    function updateCirculatingSupply() public {
        if (block.timestamp >= _lastUpdateTime + UPDATE_INTERVAL) {
            _updateCirculatingSupplyInternal();
        }
    }

    function _updateCirculatingSupplyInternal() internal {
        (
            int256 responseCode,
            IHederaTokenService.TokenInfo memory tokenInfo
        ) = HederaTokenService.getTokenInfo(htsToken);
        require(
            responseCode == HederaResponseCodes.SUCCESS,
            "Failed to get token info"
        );
        _cachedCirculatingSupply = uint256(uint64(tokenInfo.totalSupply));
        _lastUpdateTime = block.timestamp;
    }

    function token() public view virtual override returns (address) {
        return htsToken;
    }

    function _debitFrom(
        address _from,
        uint16,
        bytes32,
        uint _amount
    ) internal virtual override returns (uint) {
        address spender = _msgSender();
        if (_from != spender) {
            int256 response = HederaTokenService.approve(
                htsToken,
                spender,
                _amount
            );
            require(
                response == HederaResponseCodes.SUCCESS,
                "HTSOFT: Failed to approve"
            );
        }
        (int256 response, ) = HederaTokenService.burnToken(
            htsToken,
            int64(uint64(_amount)),
            new int64[](0)
        );
        require(response == HederaResponseCodes.SUCCESS, "HTSOFT: Burn failed");
        return _amount;
    }

    function _creditTo(
        uint16,
        address _toAddress,
        uint _amount
    ) internal virtual override returns (uint) {
        (int256 response, , ) = HederaTokenService.mintToken(
            htsToken,
            int64(uint64(_amount)),
            new bytes[](0)
        );
        require(response == HederaResponseCodes.SUCCESS, "HTSOFT: Mint failed");
        int256 transferResponse = HederaTokenService.transferToken(
            htsToken,
            address(this),
            _toAddress,
            int64(uint64(_amount))
        );
        require(
            transferResponse == HederaResponseCodes.SUCCESS,
            "HTSOFT: Transfer failed"
        );
        return _amount;
    }

    function _transferFrom(
        address _from,
        address _to,
        uint _amount
    ) internal virtual override returns (uint) {
        address spender = _msgSender();
        if (_from != address(this) && _from != spender) {
            int256 response = HederaTokenService.approve(
                htsToken,
                spender,
                _amount
            );
            require(
                response == HederaResponseCodes.SUCCESS,
                "HTSOFT: Failed to approve"
            );
        }
        int256 transferResponse = HederaTokenService.transferToken(
            htsToken,
            _from,
            _to,
            int64(uint64(_amount))
        );
        require(
            transferResponse == HederaResponseCodes.SUCCESS,
            "HTSOFT: Transfer failed"
        );
        return _amount;
    }

    function _ld2sdRate() internal view virtual override returns (uint) {
        return ld2sdRate;
    }
}
