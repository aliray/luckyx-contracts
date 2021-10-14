//SPDX-License-Identifier: MIT
pragma solidity >0.6.0;

pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./Testable.sol";

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./SafeMath16.sol";
import "./SafeMath8.sol";

import './ILottx.sol';

contract Lottxnft is ERC1155, Ownable, Testable {
    // Libraries
    // Safe math
    using SafeMath for uint256;
    using SafeMath16 for uint16;
    using SafeMath8 for uint8;

    // State variables
    address internal lotteryContract;
    uint256 internal totalSupply;
    // Storage for ticket information
    struct TicketInfo {
        address owner;
        uint16[] numbers;
        bool claimed;
        uint256 lottid;
    }
    // Token ID => Token information
    mapping(uint256 => TicketInfo) internal ticketInfo;
    // User address => Lottery ID => Ticket IDs the user ticket mapping with lottid and nftids
    mapping(address => mapping(uint256 => uint256[])) internal userTickets;

    //-------------------------------------------------------------------------
    // EVENTS
    //-------------------------------------------------------------------------

    event InfoBatchMint(
        address indexed receiving,
        uint256 lotteid,
        uint256 amountOfTokens,
        uint256[] tokenIds
    );

    //-------------------------------------------------------------------------
    // MODIFIERS
    //-------------------------------------------------------------------------

    /**
     * @notice  Restricts minting of new tokens to only the lotto contract.
     */
    modifier onlyLotto() {
        require(msg.sender == lotteryContract, "Only Lotto can mint");
        _;
    }

    //-------------------------------------------------------------------------
    // CONSTRUCTOR
    //-------------------------------------------------------------------------

    /**
     * @param   _uri A dynamic URI that enables individuals to view information
     *          around their NFT token. To see the information replace the
     *          `\{id\}` substring with the actual token type ID. For more info
     *          visit:
     *          https://eips.ethereum.org/EIPS/eip-1155#metadata[defined in the EIP].
     * @param   _lotto The address of the lotto contract. The lotto contract has
     *          elevated permissions on this contract.
     */
    constructor(
        string memory _uri,
        address _lotto,
        address _timer
    ) ERC1155(_uri) Testable(_timer) {
        lotteryContract = _lotto;
    }

    //-------------------------------------------------------------------------
    // VIEW FUNCTIONS
    //-------------------------------------------------------------------------

    function getTotalSupply() external view returns (uint256) {
        return totalSupply;
    }

    /**
     * @param   _ticketID: The unique ID of the ticket
     * @return  uint32[]: The chosen numbers for that ticket
     */
    function getTicketNumbers(uint256 _ticketID)
        external
        view
        returns (uint16[] memory)
    {
        return ticketInfo[_ticketID].numbers;
    }

    /**
     * @param   _ticketID: The unique ID of the ticket
     * @return  address: Owner of ticket
     */
    function getOwnerOfTicket(uint256 _ticketID)
        external
        view
        returns (address)
    {
        return ticketInfo[_ticketID].owner;
    }

    function getTicketClaimStatus(uint256 _ticketID)
        external
        view
        returns (bool)
    {
        return ticketInfo[_ticketID].claimed;
    }

    function getUserTickets(uint256 _lotteid, address _user)
        external
        view
        returns (uint256[] memory)
    {
        return userTickets[_user][_lotteid];
    }

    function getUserTicketsPagination(
        address _user,
        uint256 _lotteid,
        uint256 cursor,
        uint256 size
    ) external view returns (uint256[] memory, uint256) {
        uint256 length = size;
        if (length > userTickets[_user][_lotteid].length - cursor) {
            length = userTickets[_user][_lotteid].length - cursor;
        }
        uint256[] memory values = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            values[i] = userTickets[_user][_lotteid][cursor + i];
        }
        return (values, cursor + length);
    }

    //-------------------------------------------------------------------------
    // STATE MODIFYING FUNCTIONS
    //-------------------------------------------------------------------------

    /**
     * @param   _to The address being minted to
     * @param   _numberOfTickets The number of NFT's to mint
     * @notice  Only the lotto contract is able to mint tokens. 
        // uint8[][] calldata _lottoNumbers
     */
    function batchMint(
        address _to,
        uint256 _lottid,
        uint8 _numberOfTickets,
        uint16[] calldata _numbers,
        uint8 _sizeOfLottery
    ) external onlyLotto() returns (uint256[] memory) {
        // Storage for the amount of tokens to mint (always 1)
        uint256[] memory amounts = new uint256[](_numberOfTickets);
        // Storage for the token IDs
        uint256[] memory tokenIds = new uint256[](_numberOfTickets);
        for (uint8 i = 0; i < _numberOfTickets; i++) {

            // Incrementing the tokenId counter
            totalSupply = totalSupply.add(1);
            tokenIds[i] = totalSupply;
            amounts[i] = 1;
            
            // Getting the start and end position of numbers for this ticket
            uint16 start = uint16(i.mul(_sizeOfLottery));
            uint16 end = uint16((i.add(1)).mul(_sizeOfLottery));
            uint16[] calldata numbers = _numbers[start:end];
            
            ticketInfo[totalSupply] = TicketInfo(
                _to,
                numbers,
                false,
                _lottid
            );
            userTickets[_to][_lottid].push(totalSupply);
        }

        // super call mint nft 
        _mintBatch(_to, tokenIds, amounts, msg.data);
        
        // Emitting relevant info
        emit InfoBatchMint(_to, _lottid, _numberOfTickets, tokenIds);
        // Returns the token IDs of minted tokens
        return tokenIds;
    }

    function claimTicket(uint256 _ticketID, uint256 _lottid)
        external
        onlyLotto()
        returns (bool)
    {
        require(
            ticketInfo[_ticketID].claimed == false,
            "Ticket already claimed"
        );
        require(
            ticketInfo[_ticketID].lottid == _lottid,
            "Ticket not for this lottery"
        );
        uint256 maxRange = ILottx(lotteryContract).getMaxRange();
        for (uint256 i = 0; i < ticketInfo[_ticketID].numbers.length; i++) {
            if (ticketInfo[_ticketID].numbers[i] > maxRange) {
                return false;
            }
        }

        ticketInfo[_ticketID].claimed = true;
        return true;
    }

    //-------------------------------------------------------------------------
    // INTERNAL FUNCTIONS
    //-------------------------------------------------------------------------
}
