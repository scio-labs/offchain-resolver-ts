// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Controllable.sol";

contract RegistrationProxy is Ownable, Controllable {
    enum Status {
        NON_EXISTENT,
        PENDING,
        SUCCESS,
        FAILURE
    }

    event InitiateRequest(
        uint256 indexed id, string name, string recipient, uint8 yearsToRegister, uint256 value, uint256 ttl
    );

    event ResultInfo(uint256 indexed id, bool success, uint256 refundAmt);

    struct Record {
        // string name;
        address initiator;
        uint256 value;
        uint256 ttl;
        Status status;
    }

    uint256 public id;
    uint256 public holdPeriod;
    uint256 private lockedFunds;
    mapping(uint256 => Record) public idToRecord;

    constructor(uint256 _holdPeriod) Ownable() {
        holdPeriod = _holdPeriod;
    }

    function setHoldPeriod(uint256 _holdPeriod) external onlyOwner {
        holdPeriod = _holdPeriod;
    }

    function register(string calldata name, string calldata recipient, uint8 yearsToRegister) external payable {
        uint256 ttl = block.timestamp + holdPeriod;
        uint256 _id = id++;

        lockedFunds += msg.value;
        idToRecord[_id] = Record(msg.sender, msg.value, ttl, Status.PENDING);

        emit InitiateRequest(_id, name, recipient, yearsToRegister, msg.value, ttl);
    }

    function success(uint256 _id, uint256 refundAmt) external onlyController {
        Record memory record = idToRecord[_id];
        require(record.status == Status.PENDING, "Invalid state");
        require(refundAmt <= record.value, "Refund exceeds received value");

        record.status = Status.SUCCESS;
        idToRecord[_id] = record;
        payable(record.initiator).transfer(refundAmt);
        lockedFunds -= refundAmt;

        emit ResultInfo(_id, true, refundAmt);
    }

    function failure(uint256 _id) external {
        Record memory record = idToRecord[_id];
        require(record.status == Status.PENDING, "Invalid state");
        require(controllers[msg.sender] || record.ttl < block.timestamp, "Only controller can respond till TTL");

        record.status = Status.FAILURE;
        idToRecord[_id] = record;
        payable(record.initiator).transfer(record.value);
        lockedFunds -= record.value;

        emit ResultInfo(_id, false, record.value);
    }

    function withdrawFunds(address payable beneficiary, uint256 value) external onlyOwner {
        uint256 maxWithdrawableBalance = address(this).balance - lockedFunds;
        require(value <= maxWithdrawableBalance, "Insufficient Balance");
        beneficiary.transfer(value);
    }
}
