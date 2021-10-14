//SPDX-License-Identifier: MIT
pragma solidity >0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./SafeMath16.sol";
import "./SafeMath8.sol";
import "./Testable.sol";

import "./ILottxnft.sol";
import "./IRandomNumberGenerator.sol";

contract Lottx is Ownable, Initializable, Testable {
    using SafeMath for uint256;
    using SafeMath16 for uint16;
    using SafeMath8 for uint8;
    using Address for address;

    IERC20 USDT; // current payment
    ILottxnft nft;
    IRandomNumberGenerator randomGenerator;

    uint256 lotteryIdCounter;
    uint8 public sizeOfLotteryNubers;
    uint8 public maxNumberTicketsPerBatch;
    uint16 public maxValidRange; //
    bytes32 requestId;

    enum Status {
        NotStarted,
        Open,
        Closed,
        Completed
    }

    struct Lottxinfo {
        uint256 lotteryId;
        Status lotteryStatus;
        uint256 totalPrize;
        uint256 costPerTicket;
        uint256 startTimestamp;
        uint256 closedTimestamp;
        uint8[] prizeDistribution; // The distribution for prize money
        uint16[] luckyNumbers;
    }

    mapping(uint256 => Lottxinfo) internal allLottx;

    modifier notContract() {
        require(!address(msg.sender).isContract(), "contract not allowed");
        require(msg.sender == tx.origin, "proxy contract not allowed");
        _;
    }

    modifier onlyRandomGenerator() {
        require(
            msg.sender == address(randomGenerator),
            "Only random generator"
        );
        _;
    }

    event TicketsPurchase(
        uint256 lotteryId,
        uint8 numberTickets,
        address indexed buyer,
        uint256[] ticketIDs,
        uint16[] numbers,
        uint256 totalCost
    );

    event RequestNumbers(uint256 lotteryId, bytes32 requestId);

    event UpdatedSizeOfLottery(address admin, uint8 newLotterySize);

    event UpdatedMaxRange(address admin, uint16 newMaxRange);

    event LotteryOpen(
        uint256 indexed lotteryId,
        uint256 ticketSupply,
        uint256 startTime,
        uint256 endTime,
        uint256 costPerTicket,
        uint8[] prizeDistribution
    );

    event LotteryNumberDrawn(uint256 indexed lotteryId, uint16[] finalNumber);

    event LotteryClose(uint256 indexed lotteryId, uint256 ticketSupply);

    event TicketsClaim(
        address indexed claimer,
        uint256 indexed lotteryId,
        uint256 numberTickets
    );

    constructor(
        address _usdt,
        address _timer,
        uint8 _sizeOfLotteryNubers,
        uint16 _maxValidRange,
        uint8 _maxNumberTicketsPerBatch
    ) Testable(_timer) {
        require(_usdt != address(0), "Contracts cannot be 0 address");

        require(
            _sizeOfLotteryNubers != 0 &&
                _maxValidRange != 0 &&
                _maxNumberTicketsPerBatch != 0,
            "Lottery setup cannot be 0"
        );
        USDT = IERC20(_usdt);
        // ticketNft = _ticketNft;
        sizeOfLotteryNubers = _sizeOfLotteryNubers;
        maxValidRange = _maxValidRange;
        maxNumberTicketsPerBatch = _maxNumberTicketsPerBatch;
    }

    function initialize(address _nft, address _IRandomNumberGenerator)
        external
        initializer
        onlyOwner
    {
        require(
            _nft != address(0) && _IRandomNumberGenerator != address(0),
            "Contracts cannot be 0 address"
        );
        nft = ILottxnft(_nft);
        randomGenerator = IRandomNumberGenerator(_IRandomNumberGenerator);
    }

    // some view function
    function ticketsCost(uint256 _lotteryId, uint256 _numberOfTickets)
        external
        view
        returns (uint256 totalCost)
    {
        totalCost = allLottx[_lotteryId].costPerTicket.mul(_numberOfTickets);
    }

    function getBasicLottoInfo(uint256 _lotteryId)
        external
        view
        returns (Lottxinfo memory)
    {
        return (allLottx[_lotteryId]);
    }

    function getMaxRange() external view returns (uint16) {
        return maxValidRange;
    }

    // update functiion
    function updateSizeOfLottery(uint8 _newSize) external onlyOwner {
        require(sizeOfLotteryNubers != _newSize, "Cannot set to current size");
        require(sizeOfLotteryNubers != 0, "Lottery size cannot be 0");
        sizeOfLotteryNubers = _newSize;

        emit UpdatedSizeOfLottery(msg.sender, _newSize);
    }

    function updateMaxRange(uint16 _newMaxRange) external onlyOwner {
        require(maxValidRange != _newMaxRange, "Cannot set to current size");
        require(maxValidRange != 0, "Max range cannot be 0");
        maxValidRange = _newMaxRange;

        emit UpdatedMaxRange(msg.sender, _newMaxRange);
    }

    // owner function
    // bugs if owner call this function twice this will create twice.
    function createLuckyNumbers(uint256 _lotteryId) external onlyOwner {
        require(
            allLottx[_lotteryId].closedTimestamp <= getCurrentTime(),
            "Cannot set winning numbers during lottery"
        );
        require(
            allLottx[_lotteryId].lotteryStatus == Status.Open,
            "Lottery State incorrect for draw"
        );

        requestId = randomGenerator.getRandomNumber(_lotteryId);
        allLottx[_lotteryId].lotteryStatus = Status.Closed;

        emit RequestNumbers(_lotteryId, requestId);
    }

    // chain link call back function
    function numbersDrawn(
        uint256 _lotteryId,
        bytes32 _requestId,
        uint256 _randomNumber
    ) external onlyRandomGenerator {
        require(
            allLottx[_lotteryId].lotteryStatus == Status.Closed,
            "Draw numbers first"
        );
        if (requestId == _requestId) {
            allLottx[_lotteryId].lotteryStatus = Status.Completed;
            allLottx[_lotteryId].luckyNumbers = _split(_randomNumber);
        }
        emit LotteryClose(_lotteryId, nft.getTotalSupply());
        emit LotteryNumberDrawn(_lotteryId, _split(_randomNumber));
    }

    function createNewLott(
        uint8[] calldata _prizeDistribution,
        uint256 _totalPrize,
        uint256 _costPerTicket,
        uint256 _startingTimestamp,
        uint256 _closingTimestamp
    ) external onlyOwner returns (uint256 _lotteryId) {
        require(
            _prizeDistribution.length == sizeOfLotteryNubers,
            "Invalid distribution"
        );

        uint256 prizeDistributionTotal = 0;
        for (uint256 j = 0; j < _prizeDistribution.length; j++) {
            prizeDistributionTotal = prizeDistributionTotal.add(
                uint256(_prizeDistribution[j])
            );
        }

        // Ensuring that prize distribution total is 100%
        require(
            prizeDistributionTotal == 100,
            "Prize distribution is not 100%"
        );
        require(
            _totalPrize != 0 && _costPerTicket != 0,
            "Prize or cost cannot be 0"
        );
        require(
            _startingTimestamp != 0 && _startingTimestamp < _closingTimestamp,
            "Timestamps for lottery invalid"
        );

        lotteryIdCounter = lotteryIdCounter.add(1);
        _lotteryId = lotteryIdCounter;
        uint16[] memory _luckyNumbers = new uint16[](sizeOfLotteryNubers);
        Status lotteryStatus = _startingTimestamp >= getCurrentTime()
            ? Status.Open
            : Status.NotStarted;

        // Saving data in struct
        Lottxinfo memory newLottery = Lottxinfo(
            _lotteryId,
            lotteryStatus,
            _totalPrize,
            _costPerTicket,
            _startingTimestamp,
            _closingTimestamp,
            _prizeDistribution,
            _luckyNumbers
        );
        allLottx[_lotteryId] = newLottery;

        emit LotteryOpen(
            _lotteryId,
            nft.getTotalSupply(),
            _startingTimestamp,
            _closingTimestamp,
            _costPerTicket,
            newLottery.prizeDistribution
        );
    }

    // user access functions

    function buyLottTickets(
        uint256 _lotteryId,
        uint8 _numberOfTickets,
        uint16[] calldata _chosenNumbers
    ) external notContract {
        // Ensuring the lottery is within a valid time
        require(
            getCurrentTime() >= allLottx[_lotteryId].startTimestamp,
            "Invalid time for mint:start"
        );
        require(
            getCurrentTime() < allLottx[_lotteryId].closedTimestamp,
            "Invalid time for mint:end"
        );
        require(
            allLottx[_lotteryId].lotteryStatus == Status.Open,
            "Lottery not in state for mint"
        );
        require(
            _numberOfTickets <= maxNumberTicketsPerBatch,
            "Batch mint too large"
        );
        require(
            _chosenNumbers.length == _numberOfTickets.mul(sizeOfLotteryNubers),
            "Invalid chosen numbers"
        );

        uint256 totalCost = this.ticketsCost(_lotteryId, _numberOfTickets);
        USDT.transferFrom(msg.sender, address(this), totalCost);

        uint256[] memory ticketIds = nft.batchMint(
            msg.sender,
            _lotteryId,
            _numberOfTickets,
            _chosenNumbers,
            sizeOfLotteryNubers
        );

        emit TicketsPurchase(
            _lotteryId,
            _numberOfTickets,
            msg.sender,
            ticketIds,
            _chosenNumbers,
            totalCost
        );
    }

    function claimReward(uint256 _lotteryId, uint256 _tokenId)
        external
        notContract
    {
        // Checking the lottery is in a valid time for claiming
        require(
            allLottx[_lotteryId].closedTimestamp <= getCurrentTime(),
            "Wait till end to claim"
        );
        // Checks the lottery winning numbers are available
        require(
            allLottx[_lotteryId].lotteryStatus == Status.Completed,
            "Winning Numbers not chosen yet"
        );
        require(
            nft.getOwnerOfTicket(_tokenId) == msg.sender,
            "Only the owner can claim"
        );
        // Sets the claim of the ticket to true (if claimed, will revert)
        require(
            nft.claimTicket(_tokenId, _lotteryId),
            "Numbers for ticket invalid"
        );

        // Getting the number of matching tickets
        uint8 matchingNumbers = _getNumberOfMatching(
            nft.getTicketNumbers(_tokenId),
            allLottx[_lotteryId].luckyNumbers
        );
        // Getting the prize amount for those matching tickets
        uint256 prizeAmount = _prizeForMatching(matchingNumbers, _lotteryId);
        // Removing the prize amount from the pool
        allLottx[_lotteryId].totalPrize = allLottx[_lotteryId].totalPrize.sub(
            prizeAmount
        );
        // Transfering the user their winnings
        USDT.transfer(address(msg.sender), prizeAmount);

        emit TicketsClaim(msg.sender, _lotteryId, 1);
    }

    function batchClaimRewards(uint256 _lotteryId, uint256[] calldata _tokeIds)
        external
        notContract
    {
        require(_tokeIds.length <= 50, "Batch claim too large");
        // Checking the lottery is in a valid time for claiming
        require(
            allLottx[_lotteryId].closedTimestamp <= getCurrentTime(),
            "Wait till end to claim"
        );
        // Checks the lottery winning numbers are available
        require(
            allLottx[_lotteryId].lotteryStatus == Status.Completed,
            "Winning Numbers not chosen yet"
        );
        // Creates a storage for all winnings
        uint256 totalPrize = 0;
        // Loops through each submitted token
        for (uint256 i = 0; i < _tokeIds.length; i++) {
            // Checks user is owner (will revert entire call if not)
            require(
                nft.getOwnerOfTicket(_tokeIds[i]) == msg.sender,
                "Only the owner can claim"
            );
            // If token has already been claimed, skip token
            if (nft.getTicketClaimStatus(_tokeIds[i])) {
                continue;
            }
            // Claims the ticket (will only revert if numbers invalid)
            require(
                nft.claimTicket(_tokeIds[i], _lotteryId),
                "Numbers for ticket invalid"
            );
            // Getting the number of matching tickets
            uint8 matchingNumbers = _getNumberOfMatching(
                nft.getTicketNumbers(_tokeIds[i]),
                allLottx[_lotteryId].luckyNumbers
            );
            // Getting the prize amount for those matching tickets
            uint256 prizeAmount = _prizeForMatching(
                matchingNumbers,
                _lotteryId
            );
            // Removing the prize amount from the pool
            allLottx[_lotteryId].totalPrize = allLottx[_lotteryId]
                .totalPrize
                .sub(prizeAmount);
            totalPrize = totalPrize.add(prizeAmount);
        }
        // Transferring the user their winnings
        USDT.transfer(address(msg.sender), totalPrize);

        emit TicketsClaim(
            msg.sender,
            _lotteryId,
            _tokeIds.length // numberTickets
        );
    }

    // internal utils functions

    function _split(uint256 _randomNumber)
        internal
        view
        returns (uint16[] memory)
    {
        uint16[] memory _luckyNumbers = new uint16[](sizeOfLotteryNubers);
        // Loops the size of the number of tickets in the lottery
        for (uint256 i = 0; i < sizeOfLotteryNubers; i++) {
            // Encodes the random number with its position in loop
            bytes32 hashOfRandom = keccak256(
                abi.encodePacked(_randomNumber, i)
            );
            // Casts random number hash into uint256
            uint256 numberRepresentation = uint256(hashOfRandom);
            // Sets the winning number position to a uint16 of random hash number
            _luckyNumbers[i] = uint16(numberRepresentation.mod(maxValidRange));
        }
        return _luckyNumbers;
    }

    function _getNumberOfMatching(
        uint16[] memory _usersNumbers,
        uint16[] memory _winningNumbers
    ) internal pure returns (uint8 noOfMatching) {
        // Loops through all wimming numbers
        for (uint256 i = 0; i < _winningNumbers.length; i++) {
            // If the winning numbers and user numbers match
            if (_usersNumbers[i] == _winningNumbers[i]) {
                // The number of matching numbers incrases
                noOfMatching += 1;
            }
        }
    }

    /**
     * @param   _noOfMatching: The number of matching numbers the user has
     * @param   _lotteryId: The ID of the lottery the user is claiming on
     * @return  uint256: The prize amount in cake the user is entitled to
     */
    function _prizeForMatching(uint8 _noOfMatching, uint256 _lotteryId)
        internal
        view
        returns (uint256)
    {
        uint256 prize = 0;
        // If user has no matching numbers their prize is 0
        if (_noOfMatching == 0) {
            return 0;
        }
        // Getting the percentage of the pool the user has won
        uint256 perOfPool = allLottx[_lotteryId].prizeDistribution[
            _noOfMatching - 1
        ];
        // Timesing the percentage one by the pool
        prize = allLottx[_lotteryId].totalPrize.mul(perOfPool);
        // Returning the prize divided by 100 (as the prize distribution is scaled)
        return prize.div(100);
    }
}
