// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Controllable.sol";

contract RegistrationProxy is Ownable, Controllable {
    enum Status {
        NON_EXISTENT,
        PENDING,
        SUCCESS,
        FAILURE
    }

    event InitiateRequest(
        uint256 indexed id,
        string name,
        string recipient,
        uint8 yearsToRegister,
        string[2][] metadata,
        address paymentToken,
        uint256 value,
        uint256 ttl
    );

    event ResultInfo(uint256 indexed id, bool success, uint256 refundAmt);

    struct Record {
        // string name;
        address initiator;
        address paymentToken;
        uint256 value;
        uint256 ttl;
        Status status;
    }

    uint256 public id;
    uint256 public holdPeriod;
    mapping(address => uint256) public lockedFunds;
    mapping(uint256 => Record) public idToRecord;
    mapping(address => bool) public whitelistedTokens;

    constructor(uint256 _holdPeriod) Ownable() {
        holdPeriod = _holdPeriod;
    }

    function setHoldPeriod(uint256 _holdPeriod) external onlyOwner {
        holdPeriod = _holdPeriod;
    }

    function setWhitelistToken(address paymentToken, bool state) external onlyOwner {
        whitelistedTokens[paymentToken] = state;
    }

    function register(
        string calldata name,
        string calldata recipient,
        uint8 yearsToRegister,
        string[2][] calldata metadata
    ) external payable {
        _register(name, recipient, yearsToRegister, metadata, address(0), msg.value);
    }

    function register(
        string calldata name,
        string calldata recipient,
        uint8 yearsToRegister,
        string[2][] calldata metadata,
        address paymentToken,
        uint256 value
    ) external {
        _collectPayment(msg.sender, paymentToken, value);
        _register(name, recipient, yearsToRegister, metadata, paymentToken, value);
    }

    function success(uint256 _id, uint256 refundAmt) external onlyController {
        Record memory record = idToRecord[_id];
        require(record.status == Status.PENDING, "Invalid state");
        require(refundAmt <= record.value, "Refund exceeds received value");

        record.status = Status.SUCCESS;
        idToRecord[_id] = record;
        _transferFunds(record.initiator, record.paymentToken, record.value);
        lockedFunds[record.paymentToken] -= record.value;

        emit ResultInfo(_id, true, refundAmt);
    }

    function failure(uint256 _id) external {
        Record memory record = idToRecord[_id];
        require(record.status == Status.PENDING, "Invalid state");
        require(controllers[msg.sender] || record.ttl < block.timestamp, "Only controller can respond till TTL");

        record.status = Status.FAILURE;
        idToRecord[_id] = record;
        _transferFunds(record.initiator, record.paymentToken, record.value);
        lockedFunds[record.paymentToken] -= record.value;

        emit ResultInfo(_id, false, record.value);
    }

    function withdrawFunds(address beneficiary, address paymentToken, uint256 value) external onlyOwner {
        uint256 maxWithdrawableBalance = _contractBalance(paymentToken) - lockedFunds[paymentToken];
        require(value <= maxWithdrawableBalance, "Insufficient Balance");
        _transferFunds(beneficiary, paymentToken, value);
    }

    function _register(
        string calldata name,
        string calldata recipient,
        uint8 yearsToRegister,
        string[2][] calldata metadata,
        address paymentToken,
        uint256 value
    ) private returns (uint256 _id) {
        _id = id++;
        uint256 ttl = block.timestamp + holdPeriod;

        lockedFunds[paymentToken] += msg.value;
        idToRecord[_id] = Record(msg.sender, paymentToken, value, ttl, Status.PENDING);

        emit InitiateRequest(_id, name, recipient, yearsToRegister, metadata, paymentToken, value, ttl);
    }

    function _contractBalance(address paymentToken) private view returns (uint256) {
        if (paymentToken == address(0)) return address(this).balance;
        return IERC20(paymentToken).balanceOf(address(this));
    }

    function _transferFunds(address beneficiary, address paymentToken, uint256 value) private {
        if (paymentToken == address(0)) {
            payable(beneficiary).transfer(value);
        } else {
            require(IERC20(paymentToken).transfer(beneficiary, value), "erc20: transfer failed");
        }
    }

    function _collectPayment(address from, address paymentToken, uint256 value) private {
        require(whitelistedTokens[paymentToken], "given token not accepted");
        require(IERC20(paymentToken).transferFrom(from, address(this), value), "erc20: payment failed");
    }
}
