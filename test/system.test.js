const { expect, assert } = require("chai");
const { network } = require("hardhat");
const {
    lotto,
    lottoNFT,
    BigNumber,
    generateLottoNumbers
} = require("./settings.js");

describe("Lottery contract", function () {

    let mock_erc20Contract;
    let lotteryInstance, lotteryContract;
    let lotteryNftInstance, lotteryNftContract;
    let cakeInstance;
    let timerInstance, timerContract;
    let randGenInstance, randGenContract;
    let linkInstance;
    let mock_vrfCoordInstance, mock_vrfCoordContract;

    let owner, buyer;

    let lotteryid;

    beforeEach(async () => {
        // Getting the signers provided by ethers
        const signers = await ethers.getSigners();
        // Creating the active wallets for use
        owner = signers[0];
        buyer = signers[1];

        lotteryContract = await ethers.getContractFactory("Lottx");
        lotteryNftContract = await ethers.getContractFactory("Lottxnft");
        mock_erc20Contract = await ethers.getContractFactory("Mock_erc20");
        timerContract = await ethers.getContractFactory("Timer");
        randGenContract = await ethers.getContractFactory("RandomNumberGenerator");
        mock_vrfCoordContract = await ethers.getContractFactory("Mock_VRFCoordinator");

        // Deploying the instances
        timerInstance = await timerContract.deploy();
        cakeInstance = await mock_erc20Contract.deploy(
            lotto.buy.cake,
        );
        linkInstance = await mock_erc20Contract.deploy(
            lotto.buy.cake,
        );
        mock_vrfCoordInstance = await mock_vrfCoordContract.deploy(
            linkInstance.address,
            lotto.chainLink.keyHash,
            lotto.chainLink.fee
        );
        lotteryInstance = await lotteryContract.deploy(
            cakeInstance.address,
            timerInstance.address,
            lotto.setup.sizeOfLottery,
            lotto.setup.maxValidRange,
            lotto.setup.maxNumberTicketsPerBatch
        );
        randGenInstance = await randGenContract.deploy(
            mock_vrfCoordInstance.address,
            linkInstance.address,
            lotteryInstance.address,
            lotto.chainLink.keyHash,
            lotto.chainLink.fee
        );
        lotteryNftInstance = await lotteryNftContract.deploy(
            lottoNFT.newLottoNft.uri,
            lotteryInstance.address,
            timerInstance.address
        );
        await lotteryInstance.initialize(
            lotteryNftInstance.address,
            randGenInstance.address
        );
        // Making sure the lottery has some cake
        await cakeInstance.mint(
            lotteryInstance.address,
            lotto.newLotto.prize
        );
        // await cakeInstance.mint(
        //     owner.address,
        //     lotto.newLotto.prize
        // );
        // Sending link to lottery
        await linkInstance.transfer(
            randGenInstance.address,
            lotto.buy.cake
        );
    });

    describe("Creating a new lottery tests", function () {
        /**
         * Tests that in the nominal case nothing goes wrong
         */
        it("Nominal case", async function () {
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Creating a new lottery
            lotteryid = await expect(
                lotteryInstance.connect(owner).createNewLott(
                    lotto.newLotto.distribution,
                    lotto.newLotto.prize,
                    lotto.newLotto.cost,
                    timeStamp.toString(),
                    timeStamp.plus(lotto.newLotto.closeIncrease).toString()
                )
            ).to.emit(lotteryInstance, lotto.events.new)
                // Checking that emitted event contains correct information
                .withArgs(
                    1,
                    0,
                    timeStamp.toString(),
                    timeStamp.plus(lotto.newLotto.closeIncrease).toString(),
                    lotto.newLotto.cost,
                    lotto.newLotto.distribution
                );
        });
        /**
         * Testing that non-admins cannot create a lotto
         */
        it("Invalid admin", async function () {
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Checking call reverts with correct error message
            await expect(
                lotteryInstance.connect(buyer).createNewLott(
                    lotto.newLotto.distribution,
                    lotto.newLotto.prize,
                    lotto.newLotto.cost,
                    timeStamp.toString(),
                    timeStamp.plus(lotto.newLotto.closeIncrease).toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_admin);
        });
        /**
         * Testing that an invalid distribution will fail
         */
        it("Invalid price distribution length", async function () {
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Checking call reverts with correct error message
            await expect(
                lotteryInstance.connect(owner).createNewLott(
                    lotto.errorData.distribution_length,
                    lotto.newLotto.prize,
                    lotto.newLotto.cost,
                    timeStamp.toString(),
                    timeStamp.plus(lotto.newLotto.closeIncrease).toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_distribution_length);
        });
        /**
         * Testing that an invalid distribution will fail
         */
        it("Invalid price distribution total", async function () {
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Checking call reverts with correct error message
            await expect(
                lotteryInstance.connect(owner).createNewLott(
                    lotto.errorData.distribution_total,
                    lotto.newLotto.prize,
                    lotto.newLotto.cost,
                    timeStamp.toString(),
                    timeStamp.plus(lotto.newLotto.closeIncrease).toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_distribution_total);
        });
        /**
         * Testing that an invalid prize and cost will fail
         */
        it("Invalid price distribution", async function () {
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Checking call reverts with correct error message
            await expect(
                lotteryInstance.connect(owner).createNewLott(
                    lotto.newLotto.distribution,
                    lotto.errorData.prize,
                    lotto.newLotto.cost,
                    timeStamp.toString(),
                    timeStamp.plus(lotto.newLotto.closeIncrease).toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_price_or_cost);
            // Checking call reverts with correct error message
            await expect(
                lotteryInstance.connect(owner).createNewLott(
                    lotto.newLotto.distribution,
                    lotto.newLotto.prize,
                    lotto.errorData.cost,
                    timeStamp.toString(),
                    timeStamp.plus(lotto.newLotto.closeIncrease).toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_price_or_cost);
        });
        /**
         * Testing that an invalid prize and cost will fail
         */
        it("Invalid timestamps", async function () {
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Checking call reverts with correct error message
            await expect(
                lotteryInstance.connect(owner).createNewLott(
                    lotto.newLotto.distribution,
                    lotto.newLotto.prize,
                    lotto.newLotto.cost,
                    lotto.errorData.startTime,
                    timeStamp.plus(lotto.newLotto.closeIncrease).toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_timestamp);
            // Checking call reverts with correct error message
            await expect(
                lotteryInstance.connect(owner).createNewLott(
                    lotto.newLotto.distribution,
                    lotto.newLotto.prize,
                    lotto.newLotto.cost,
                    timeStamp.toString(),
                    timeStamp.toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_timestamp);
        });
    });

    describe("Buying tickets tests", function () {
        /**
         * Creating a lotto for all buying tests to use. Will be a new instance
         * for each lotto. 
         */
        beforeEach(async () => {
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Creating a new lottery
            await lotteryInstance.connect(owner).createNewLott(
                lotto.newLotto.distribution,
                lotto.newLotto.prize,
                lotto.newLotto.cost,
                timeStamp.toString(),
                timeStamp.plus(lotto.newLotto.closeIncrease).toString()
            );
        });
        /**
         * Tests cost per ticket is as expected
         */
        it("Cost per ticket", async function () {
            let totalPrice = await lotteryInstance.ticketsCost(
                1,
                10
            );
            // Works back from totalPrice to one token cost
            let check = BigNumber(totalPrice.toString());
            let noOfTickets = new BigNumber(10);
            let oneCost = check.div(noOfTickets);
            // Checks price is correct
            assert.equal(
                totalPrice.toString(),
                lotto.buy.ten.cost,
                "Incorrect cost for batch buy of 10"
            );
            assert.equal(
                oneCost.toString(),
                lotto.newLotto.cost.toString(),
                "Incorrect cost for batch buy of 10"
            );
        });
        /**
         * Tests the batch buying of one token
         */
        it("Batch buying 1 tickets", async function () {
            // Getting the price to buy
            let price = await lotteryInstance.ticketsCost(
                1,
                1
            );
            // Generating chosen numbers for buy
            let ticketNumbers = generateLottoNumbers({
                numberOfTickets: 1,
                lottoSize: lotto.setup.sizeOfLottery,
                maxRange: lotto.setup.maxValidRange
            });

            // Approving lotto to spend cost 委托lottx to buy tickets
            await cakeInstance.connect(owner).approve(
                lotteryInstance.address,
                price
            );
            // Batch buying tokens
            await lotteryInstance.connect(owner).buyLottTickets(
                1,
                1,
                ticketNumbers
            );
            // Testing results
            assert.equal(
                price.toString(),
                lotto.buy.one.cost,
                "Incorrect cost for batch buy of 1"
            );
        });
        /**
         * Tests the batch buying of ten token
         */
        it("Batch buying 10 tickets", async function () {
            // Getting the price to buy
            let price = await lotteryInstance.ticketsCost(
                1,
                10
            );
            // Generating chosen numbers for buy
            let ticketNumbers = generateLottoNumbers({
                numberOfTickets: 10,
                lottoSize: lotto.setup.sizeOfLottery,
                maxRange: lotto.setup.maxValidRange
            });
            // Approving lotto to spend cost
            await cakeInstance.connect(owner).approve(
                lotteryInstance.address,
                price
            );
            // Batch buying tokens
            await lotteryInstance.connect(owner).buyLottTickets(
                1,
                10,
                ticketNumbers
            );
            // Testing results
            // TODO get user balances
            assert.equal(
                price.toString(),
                lotto.buy.ten.cost,
                "Incorrect cost for batch buy of 10"
            );
        });
        /**
         * Tests the batch buying of fifty token
         */
        it("Batch buying 50 tickets", async function () {
            // Getting the price to buy
            let price = await lotteryInstance.ticketsCost(
                1,
                50
            );
            // Generating chosen numbers for buy
            let ticketNumbers = generateLottoNumbers({
                numberOfTickets: 50,
                lottoSize: lotto.setup.sizeOfLottery,
                maxRange: lotto.setup.maxValidRange
            });
            // Approving lotto to spend cost
            await cakeInstance.connect(owner).approve(
                lotteryInstance.address,
                price
            );
            // Batch buying tokens
            await lotteryInstance.connect(owner).buyLottTickets(
                1,
                50,
                ticketNumbers
            );
            // Testing results
            assert.equal(
                price.toString(),
                lotto.buy.fifty.cost,
                "Incorrect cost for batch buy of 50"
            );
        });
        /**
         * Tests the batch buying with invalid ticket numbers
         */
        it("Invalid chosen numbers", async function () {
            // Getting the price to buy
            let price = await lotteryInstance.ticketsCost(
                1,
                10
            );
            // Generating chosen numbers for buy
            let ticketNumbers = generateLottoNumbers({
                numberOfTickets: 9,
                lottoSize: lotto.setup.sizeOfLottery,
                maxRange: lotto.setup.maxValidRange
            });
            // Approving lotto to spend cost
            await cakeInstance.connect(owner).approve(
                lotteryInstance.address,
                price
            );
            // Batch buying tokens
            await expect(
                lotteryInstance.connect(owner).buyLottTickets(
                    1,
                    10,
                    ticketNumbers
                )
            ).to.be.revertedWith(lotto.errors.invalid_mint_numbers);
        });
        /**
         * Tests the batch buying with invalid approve
         */
        it("Invalid cake transfer", async function () {
            // Generating chosen numbers for buy
            let ticketNumbers = generateLottoNumbers({
                numberOfTickets: 10,
                lottoSize: lotto.setup.sizeOfLottery,
                maxRange: lotto.setup.maxValidRange
            });
            // Batch buying tokens
            await expect(
                lotteryInstance.connect(owner).buyLottTickets(
                    1,
                    10,
                    ticketNumbers
                )
            ).to.be.revertedWith(lotto.errors.invalid_mint_approve);
        });
        /**
         * Tests the batch buying after the valid time period fails
         */
        it("Invalid buying time", async function () {
            // Getting the price to buy
            let price = await lotteryInstance.ticketsCost(
                1,
                10
            );
            // Generating chosen numbers for buy
            let ticketNumbers = generateLottoNumbers({
                numberOfTickets: 10,
                lottoSize: lotto.setup.sizeOfLottery,
                maxRange: lotto.setup.maxValidRange
            });
            // Approving lotto to spend cost
            await cakeInstance.connect(owner).approve(
                lotteryInstance.address,
                price
            );
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Getting the timestamp for invalid time for buying
            let futureTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureTime.toString());
            // Batch buying tokens
            await expect(
                lotteryInstance.connect(owner).buyLottTickets(
                    1,
                    10,
                    ticketNumbers
                )
            ).to.be.revertedWith(lotto.errors.invalid_mint_timestamp);
        });
    });

    describe("Drawing numbers tests", function () {
        beforeEach(async () => {
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Creating a new lottery
            lotteryid = await lotteryInstance.connect(owner).createNewLott(
                lotto.newLotto.distribution,
                lotto.newLotto.prize,
                lotto.newLotto.cost,
                timeStamp.toString(),
                timeStamp.plus(lotto.newLotto.closeIncrease).toString()
            );
        });
        /**
         * Testing that the winning numbers can be set in the nominal case
         */
        it("Setting winning numbers", async function () {
            let lotteryInfoBefore = await lotteryInstance.getBasicLottoInfo(1);
            // Setting the time so that we can set winning numbers
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Getting the timestamp for invalid time for buying
            let futureTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureTime.toString());
            // Drawing the numbers
            let tx = await (await lotteryInstance.connect(owner).createLuckyNumbers(
                1
                // 1234 new chain link hvae no seed.
            )).wait();
            // Getting the request ID out of events
            let requestId = tx.events[0].args.requestId.toString();
            // Mocking the VRF Coordinator contract for random request fulfilment 
            await mock_vrfCoordInstance.connect(owner).callBackWithRandomness(
                requestId,
                lotto.draw.random,
                randGenInstance.address
            );
            // Getting info after call
            let lotteryInfoAfter = await lotteryInstance.getBasicLottoInfo(1);
            // Testing
            assert.equal(
                lotteryInfoBefore.luckyNumbers.toString(),
                lotto.newLotto.win.blankWinningNumbers,
                "Winning numbers set before call"
            );
            assert.equal(
                lotteryInfoAfter.luckyNumbers.toString(),
                lotto.newLotto.win.winningNumbers,
                "Winning numbers incorrect after"
            );
        });
        /**
         * Testing that a non owner cannot set the winning numbers
         */
        it("Invalid winning numbers (owner)", async function () {
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Getting the timestamp for invalid time for buying
            let futureTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureTime.toString());
            // Drawing the numbers
            await expect(
                lotteryInstance.connect(buyer).createLuckyNumbers(
                    1
                    // 1234
                )
            ).to.be.revertedWith(lotto.errors.invalid_admin);
        });
        /**
         * Testing that numbers cannot be updated once chosen
         */
        it("Invalid winning numbers (already chosen)", async function () {
            // Setting the time so that we can set winning numbers
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Getting the timestamp for invalid time for buying
            let futureTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureTime.toString());
            // Drawing the numbers
            await lotteryInstance.connect(owner).createLuckyNumbers(
                1
                // 1234
            );
            // Drawing the numbers again
            await expect(
                lotteryInstance.connect(owner).createLuckyNumbers(
                    1
                    // 1234
                )
            ).to.be.revertedWith(lotto.errors.invalid_draw_repeat);
        });
        /**
         * Testing that winning numbers cannot be set while lottery still in 
         * progress
         */
        it("Invalid winning numbers (time)", async function () {
            await expect(
                lotteryInstance.connect(owner).createLuckyNumbers(
                    1
                    // 1234
                )
            ).to.be.revertedWith(lotto.errors.invalid_draw_time);
        });
    });

    describe("Claiming tickets tests", function () {
        beforeEach(async () => {
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Creating a new lottery
            await lotteryInstance.connect(owner).createNewLott(
                lotto.newLotto.distribution,
                lotto.newLotto.prize,
                lotto.newLotto.cost,
                timeStamp.toString(),
                timeStamp.plus(lotto.newLotto.closeIncrease).toString()
            );
            // Buying tickets
            // Getting the price to buy
            let prices = await lotteryInstance.ticketsCost(
                1,
                50
            );
            // Sending the buyer the needed amount of cake
            await cakeInstance.connect(owner).mint(
                buyer.address,
                prices
            );
            // Approving lotto to spend cost
            await cakeInstance.connect(buyer).approve(
                lotteryInstance.address,
                prices
            );
            // Generating chosen numbers for buy
            let ticketNumbers = generateLottoNumbers({
                numberOfTickets: 50,
                lottoSize: lotto.setup.sizeOfLottery,
                maxRange: lotto.setup.maxValidRange
            });
            // Batch buying tokens
            await lotteryInstance.connect(buyer).buyLottTickets(
                1,
                50,
                ticketNumbers
            );
        });
        /**
         * Testing that claiming numbers (4 match) changes the users balance
         * correctly. 
         */
        it("Claiming winning numbers (4 (all) match)", async function () {
            // Getting the price to buy
            let prices = await lotteryInstance.ticketsCost(
                1,
                1
            );
            // Sending the buyer the needed amount of cake
            await cakeInstance.connect(owner).transfer(
                buyer.address,
                prices
            );
            // Approving lotto to spend cost
            await cakeInstance.connect(buyer).approve(
                lotteryInstance.address,
                prices
            );
            await lotteryInstance.connect(buyer).buyLottTickets(
                1,
                1,
                lotto.newLotto.win.winningNumbersArr
            );
            // Setting current time so that drawing is correct
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Getting the timestamp for invalid time for buying
            let futureTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureTime.toString());
            // Getting all users bought tickets
            let userTicketIds = await lotteryNftInstance.getUserTickets(1, buyer.address);
            // Drawing the numbers
            let tx = await (await lotteryInstance.connect(owner).createLuckyNumbers(
                1
            )).wait();
            // Getting the request ID out of events
            let requestId = tx.events[0].args.requestId.toString();
            // Mocking the VRF Coordinator contract for random request fulfilment 
            await mock_vrfCoordInstance.connect(owner).callBackWithRandomness(
                requestId,
                lotto.draw.random,
                randGenInstance.address
            );
            let buyerCakeBalanceBefore = await cakeInstance.balanceOf(buyer.address);

            // Getting the current block timestamp
            currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            timeStamp = new BigNumber(currentTime.toString());
            let futureEndTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureEndTime.toString());
            // Claiming winnings 
            await lotteryInstance.connect(buyer).claimReward(
                1,
                userTicketIds[50].toString()
            );
            let buyerCakeBalanceAfter = await cakeInstance.balanceOf(buyer.address);
            // Tests
            assert.equal(
                buyerCakeBalanceBefore.toString(),
                0,
                "Buyer has cake balance before claiming"
            );
            assert.equal(
                buyerCakeBalanceAfter.toString(),
                lotto.newLotto.win.match_all.toString(),
                "User won incorrect amount"
            );
        });
        /**
         * Testing that claiming numbers (3 match) changes the users balance
         * correctly. 
         */
        it("Claiming winning numbers (3 match)", async function () {
            // Getting the price to buy
            let prices = await lotteryInstance.ticketsCost(
                1,
                1
            );
            // Sending the buyer the needed amount of cake
            await cakeInstance.connect(owner).transfer(
                buyer.address,
                prices
            );
            // Approving lotto to spend cost
            await cakeInstance.connect(buyer).approve(
                lotteryInstance.address,
                prices
            );
            let altered = lotto.newLotto.win.winningNumbersArr;
            altered[0] = 0;
            await lotteryInstance.connect(buyer).buyLottTickets(
                1,
                1,
                altered
            );
            // Setting current time so that drawing is correct
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Getting the timestamp for invalid time for buying
            let futureTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureTime.toString());
            // Getting all users bought tickets
            let userTicketIds = await lotteryNftInstance.getUserTickets(1, buyer.address);
            // Drawing the numbers
            let tx = await (await lotteryInstance.connect(owner).createLuckyNumbers(
                1
            )).wait();
            // Getting the request ID out of events
            let requestId = tx.events[0].args.requestId.toString();
            // Mocking the VRF Coordinator contract for random request fulfilment 
            await mock_vrfCoordInstance.connect(owner).callBackWithRandomness(
                requestId,
                lotto.draw.random,
                randGenInstance.address
            );
            let buyerCakeBalanceBefore = await cakeInstance.balanceOf(buyer.address);

            // Getting the current block timestamp
            currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            timeStamp = new BigNumber(currentTime.toString());
            let futureEndTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureEndTime.toString());
            // Claiming winnings 
            await lotteryInstance.connect(buyer).claimReward(
                1,
                userTicketIds[50].toString()
            );
            let buyerCakeBalanceAfter = await cakeInstance.balanceOf(buyer.address);
            // Tests
            assert.equal(
                buyerCakeBalanceBefore.toString(),
                0,
                "Buyer has cake balance before claiming"
            );
            assert.equal(
                buyerCakeBalanceAfter.toString(),
                lotto.newLotto.win.match_three.toString(),
                "User won incorrect amount"
            );
        });
        /**
         * Testing that claiming numbers (2 match) changes the users balance
         * correctly. 
         */
        it("Claiming winning numbers (2 match)", async function () {
            // Getting the price to buy
            let prices = await lotteryInstance.ticketsCost(
                1,
                1
            );
            // Sending the buyer the needed amount of cake
            await cakeInstance.connect(owner).transfer(
                buyer.address,
                prices
            );
            // Approving lotto to spend cost
            await cakeInstance.connect(buyer).approve(
                lotteryInstance.address,
                prices
            );
            let altered = lotto.newLotto.win.winningNumbersArr;
            altered[0] = 0;
            altered[1] = 0;
            await lotteryInstance.connect(buyer).buyLottTickets(
                1,
                1,
                altered
            );
            // Setting current time so that drawing is correct
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Getting the timestamp for invalid time for buying
            let futureTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureTime.toString());
            // Getting all users bought tickets
            let userTicketIds = await lotteryNftInstance.getUserTickets(1, buyer.address);
            // Drawing the numbers
            let tx = await (await lotteryInstance.connect(owner).createLuckyNumbers(
                1
            )).wait();
            // Getting the request ID out of events
            let requestId = tx.events[0].args.requestId.toString();
            // Mocking the VRF Coordinator contract for random request fulfilment 
            await mock_vrfCoordInstance.connect(owner).callBackWithRandomness(
                requestId,
                lotto.draw.random,
                randGenInstance.address
            );
            let buyerCakeBalanceBefore = await cakeInstance.balanceOf(buyer.address);

            // Getting the current block timestamp
            currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            timeStamp = new BigNumber(currentTime.toString());
            let futureEndTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureEndTime.toString());
            // Claiming winnings 
            await lotteryInstance.connect(buyer).claimReward(
                1,
                userTicketIds[50].toString()
            );
            let buyerCakeBalanceAfter = await cakeInstance.balanceOf(buyer.address);
            // Tests
            assert.equal(
                buyerCakeBalanceBefore.toString(),
                0,
                "Buyer has cake balance before claiming"
            );
            assert.equal(
                buyerCakeBalanceAfter.toString(),
                lotto.newLotto.win.match_two.toString(),
                "User won incorrect amount"
            );
        });
        /**
         * Testing that claiming numbers (1 match) changes the users balance
         * correctly. 
         */
        it("Claiming winning numbers (1 match)", async function () {
            // Getting the price to buy
            let prices = await lotteryInstance.ticketsCost(
                1,
                1
            );
            // Sending the buyer the needed amount of cake
            await cakeInstance.connect(owner).transfer(
                buyer.address,
                prices
            );
            // Approving lotto to spend cost
            await cakeInstance.connect(buyer).approve(
                lotteryInstance.address,
                prices
            );
            let altered = lotto.newLotto.win.winningNumbersArr;
            altered[0] = 0;
            altered[1] = 0;
            altered[2] = 0;
            await lotteryInstance.connect(buyer).buyLottTickets(
                1,
                1,
                altered
            );
            // Setting current time so that drawing is correct
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Getting the timestamp for invalid time for buying
            let futureTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureTime.toString());
            // Getting all users bought tickets
            let userTicketIds = await lotteryNftInstance.getUserTickets(1, buyer.address);
            // Drawing the numbers
            let tx = await (await lotteryInstance.connect(owner).createLuckyNumbers(
                1
            )).wait();
            // Getting the request ID out of events
            let requestId = tx.events[0].args.requestId.toString();
            // Mocking the VRF Coordinator contract for random request fulfilment 
            await mock_vrfCoordInstance.connect(owner).callBackWithRandomness(
                requestId,
                lotto.draw.random,
                randGenInstance.address
            );
            let buyerCakeBalanceBefore = await cakeInstance.balanceOf(buyer.address);

            // Getting the current block timestamp
            currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            timeStamp = new BigNumber(currentTime.toString());
            let futureEndTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureEndTime.toString());
            // Claiming winnings 
            await lotteryInstance.connect(buyer).claimReward(
                1,
                userTicketIds[50].toString()
            );
            let buyerCakeBalanceAfter = await cakeInstance.balanceOf(buyer.address);
            // Tests
            assert.equal(
                buyerCakeBalanceBefore.toString(),
                0,
                "Buyer has cake balance before claiming"
            );
            assert.equal(
                buyerCakeBalanceAfter.toString(),
                lotto.newLotto.win.match_one.toString(),
                "User won incorrect amount"
            );
        });
        /**
         * Testing that claiming numbers (0 match) changes the users balance
         * correctly. 
         */
        it("Claiming winning numbers (0 (none) match)", async function () {
            // Getting the price to buy
            let prices = await lotteryInstance.ticketsCost(
                1,
                1
            );
            // Sending the buyer the needed amount of cake
            await cakeInstance.connect(owner).transfer(
                buyer.address,
                prices
            );
            // Approving lotto to spend cost
            await cakeInstance.connect(buyer).approve(
                lotteryInstance.address,
                prices
            );
            let altered = lotto.newLotto.win.winningNumbersArr;
            altered[0] = 0;
            altered[1] = 0;
            altered[2] = 0;
            altered[3] = 0;
            await lotteryInstance.connect(buyer).buyLottTickets(
                1,
                1,
                altered
            );
            // Setting current time so that drawing is correct
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Getting the timestamp for invalid time for buying
            let futureTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureTime.toString());
            // Getting all users bought tickets
            let userTicketIds = await lotteryNftInstance.getUserTickets(1, buyer.address);
            // Drawing the numbers
            let tx = await (await lotteryInstance.connect(owner).createLuckyNumbers(
                1
            )).wait();
            // Getting the request ID out of events
            let requestId = tx.events[0].args.requestId.toString();
            // Mocking the VRF Coordinator contract for random request fulfilment 
            await mock_vrfCoordInstance.connect(owner).callBackWithRandomness(
                requestId,
                lotto.draw.random,
                randGenInstance.address
            );
            let buyerCakeBalanceBefore = await cakeInstance.balanceOf(buyer.address);

            // Getting the current block timestamp
            currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            timeStamp = new BigNumber(currentTime.toString());
            let futureEndTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureEndTime.toString());
            // Claiming winnings 
            await lotteryInstance.connect(buyer).claimReward(
                1,
                userTicketIds[50].toString()
            );
            let buyerCakeBalanceAfter = await cakeInstance.balanceOf(buyer.address);
            // Tests
            assert.equal(
                buyerCakeBalanceBefore.toString(),
                0,
                "Buyer has cake balance before claiming"
            );
            assert.equal(
                buyerCakeBalanceAfter.toString(),
                0,
                "User won incorrect amount"
            );
        });
        /**
         * Testing that a claim cannot happen while the lottery is still active
         */
        it("Invalid claim (incorrect time)", async function () {
            // Setting current time so that drawing is correct
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Getting the timestamp for invalid time for buying
            let futureTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureTime.toString());
            // Getting all users bought tickets
            let userTicketIds = await lotteryNftInstance.getUserTickets(1, buyer.address);
            // Drawing the numbers
            let tx = await (await lotteryInstance.connect(owner).createLuckyNumbers(
                1
            )).wait();
            // Getting the request ID out of events
            let requestId = tx.events[0].args.requestId.toString();
            // Mocking the VRF Coordinator contract for random request fulfilment 
            await mock_vrfCoordInstance.connect(owner).callBackWithRandomness(
                requestId,
                lotto.draw.random,
                randGenInstance.address
            );
            await lotteryInstance.setCurrentTime(currentTime.toString());
            // Claiming winnings 
            await expect(
                lotteryInstance.connect(buyer).claimReward(
                    1,
                    userTicketIds[25].toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_claim_time);
        });
        /**
         * Testing that a claim cannot happen until the winning numbers are
         * chosen. 
         */
        it("Invalid claim (winning numbers not chosen)", async function () {
            // Getting all users bought tickets
            let userTicketIds = await lotteryNftInstance.getUserTickets(1, buyer.address);
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            let futureEndTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureEndTime.toString());
            // Claiming winnings 
            await expect(
                lotteryInstance.connect(buyer).claimReward(
                    1,
                    userTicketIds[25].toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_claim_draw);
        });
        /**
         * Testing that only the owner of a token can claim winnings
         */
        it("Invalid claim (not owner)", async function () {
            // Setting current time so that drawing is correct
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Getting the timestamp for invalid time for buying
            let futureTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureTime.toString());
            // Getting all users bought tickets
            let userTicketIds = await lotteryNftInstance.getUserTickets(1, buyer.address);
            // Drawing the numbers
            let tx = await (await lotteryInstance.connect(owner).createLuckyNumbers(
                1
            )).wait();
            // Getting the request ID out of events
            let requestId = tx.events[0].args.requestId.toString();
            // Mocking the VRF Coordinator contract for random request fulfilment 
            await mock_vrfCoordInstance.connect(owner).callBackWithRandomness(
                requestId,
                lotto.draw.random,
                randGenInstance.address
            );
            // Getting the current block timestamp
            currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            timeStamp = new BigNumber(currentTime.toString());
            let futureEndTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureEndTime.toString());
            // Claiming winnings 
            await expect(
                lotteryInstance.connect(owner).claimReward(
                    1,
                    userTicketIds[25].toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_claim_owner);
        });
        /**
         * Testing that a ticket cannot be claimed twice
         */
        it("Invalid claim (already claimed)", async function () {
            // Setting current time so that drawing is correct
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Getting the timestamp for invalid time for buying
            let futureTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureTime.toString());
            // Getting all users bought tickets
            let userTicketIds = await lotteryNftInstance.getUserTickets(1, buyer.address);
            // Drawing the numbers
            let tx = await (await lotteryInstance.connect(owner).createLuckyNumbers(
                1
            )).wait();
            // Getting the request ID out of events
            let requestId = tx.events[0].args.requestId.toString();
            // Mocking the VRF Coordinator contract for random request fulfilment 
            await mock_vrfCoordInstance.connect(owner).callBackWithRandomness(
                requestId,
                lotto.draw.random,
                randGenInstance.address
            );
            // Getting the current block timestamp
            currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            timeStamp = new BigNumber(currentTime.toString());
            let futureEndTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureEndTime.toString());
            // Claiming winnings 
            await lotteryInstance.connect(buyer).claimReward(
                1,
                userTicketIds[25].toString()
            );
            // Claiming winnings again
            await expect(
                lotteryInstance.connect(buyer).claimReward(
                    1,
                    userTicketIds[25].toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_claim_duplicate);
        });
        /**
         * Tests that numbers outside of range are rejected on claim
         */
        it("Invalid claim (numbers out of range)", async function () {
            // Getting the price to buy
            let prices = await lotteryInstance.ticketsCost(
                1,
                1
            );
            // Sending the buyer the needed amount of cake
            await cakeInstance.connect(owner).transfer(
                buyer.address,
                prices
            );
            // Approving lotto to spend cost
            await cakeInstance.connect(buyer).approve(
                lotteryInstance.address,
                prices
            );
            await lotteryInstance.connect(buyer).buyLottTickets(
                1,
                1,
                lotto.errorData.ticketNumbers
            );
            // Setting current time so that drawing is correct
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Getting the timestamp for invalid time for buying
            let futureTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureTime.toString());
            // Getting all users bought tickets
            let userTicketIds = await lotteryNftInstance.getUserTickets(1, buyer.address);
            // Drawing the numbers
            let tx = await (await lotteryInstance.connect(owner).createLuckyNumbers(
                1
            )).wait();
            // Getting the request ID out of events
            let requestId = tx.events[0].args.requestId.toString();
            // Mocking the VRF Coordinator contract for random request fulfilment 
            await mock_vrfCoordInstance.connect(owner).callBackWithRandomness(
                requestId,
                lotto.draw.random,
                randGenInstance.address
            );
            // Getting the current block timestamp
            currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            timeStamp = new BigNumber(currentTime.toString());
            let futureEndTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureEndTime.toString());
            // Claiming winnings with invalid numbers
            await expect(
                lotteryInstance.connect(buyer).claimReward(
                    1,
                    userTicketIds[50].toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_numbers_range);
        });

        it("Invalid claim (ticket for different lottery)", async function () {
            // Getting the current block timestamp
            let currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            let timeStamp = new BigNumber(currentTime.toString());
            // Creating a new lottery
            await lotteryInstance.connect(owner).createNewLott(
                lotto.newLotto.distribution,
                lotto.newLotto.prize,
                lotto.newLotto.cost,
                timeStamp.toString(),
                timeStamp.plus(lotto.newLotto.closeIncrease).toString()
            );
            // Getting the price to buy
            let prices = await lotteryInstance.ticketsCost(
                2,
                1
            );
            // Sending the buyer the needed amount of cake
            await cakeInstance.connect(owner).transfer(
                buyer.address,
                prices
            );
            // Approving lotto to spend cost
            await cakeInstance.connect(buyer).approve(
                lotteryInstance.address,
                prices
            );
            await lotteryInstance.connect(buyer).buyLottTickets(
                2,
                1,
                lotto.newLotto.win.winningNumbersArr
            );
            // Setting current time so that drawing is correct
            // Getting the current block timestamp
            currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            timeStamp = new BigNumber(currentTime.toString());
            // Getting the timestamp for invalid time for buying
            let futureTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureTime.toString());
            // Getting all users bought tickets
            let userTicketIds = await lotteryNftInstance.getUserTickets(2, buyer.address);
            // Drawing the numbers
            let tx = await (await lotteryInstance.connect(owner).createLuckyNumbers(
                1
            )).wait();
            // Getting the request ID out of events
            let requestId = tx.events[0].args.requestId.toString();
            // Mocking the VRF Coordinator contract for random request fulfilment 
            await mock_vrfCoordInstance.connect(owner).callBackWithRandomness(
                requestId,
                lotto.draw.random,
                randGenInstance.address
            );
            // Getting the current block timestamp
            currentTime = await lotteryInstance.getCurrentTime();
            // Converting to a BigNumber for manipulation 
            timeStamp = new BigNumber(currentTime.toString());
            let futureEndTime = timeStamp.plus(lotto.newLotto.closeIncrease);
            // Setting the time forward 
            await lotteryInstance.setCurrentTime(futureEndTime.toString());
            // Claiming winnings with invalid numbers
            await expect(
                lotteryInstance.connect(buyer).claimReward(
                    1,
                    userTicketIds[0].toString()
                )
            ).to.be.revertedWith(lotto.errors.invalid_claim_lottery);
        });
    });

    describe("Upgrade functionality tests", function () {
        /**
         * Tests that an admin can update the size of a lottery
         */
        it("Update size of lottery", async function () {
            // Getting the size of the lottery
            let sizeOfLottery = await lotteryInstance.sizeOfLotteryNubers();
            // Updating the size of the lottery
            await lotteryInstance.updateSizeOfLottery(lotto.update.sizeOfLottery);
            // Getting the size of the lottery after the update
            let sizeOfLotteryAfter = await lotteryInstance.sizeOfLotteryNubers();
            // Testing
            assert.equal(
                sizeOfLottery.toString(),
                lotto.setup.sizeOfLottery,
                "Start size incorrect"
            );
            assert.equal(
                sizeOfLotteryAfter.toString(),
                lotto.update.sizeOfLottery,
                "Start incorrect after update"
            );
        });
        /**
         * Tests that size cannot be updated to current size
         */
        it("Invalid update size of lottery (same as current)", async function () {
            // Getting the size of the lottery
            let sizeOfLottery = await lotteryInstance.sizeOfLotteryNubers();
            // Updating the size of the lottery
            await expect(
                lotteryInstance.updateSizeOfLottery(sizeOfLottery.toString())
            ).to.be.revertedWith(lotto.errors.invalid_size_update_duplicate);
        });
        /**
         * Tests that a non owner cannot change the size of a lottery
         */
        it("Invalid update size of lottery (non-owner)", async function () {
            // Updating the size of the lottery
            await expect(
                lotteryInstance.connect(buyer).updateSizeOfLottery(
                    lotto.update.sizeOfLottery
                )
            ).to.be.revertedWith(lotto.errors.invalid_admin);
        });
        /**
         * Tests that an admin can update the max range of numbers
         */
        it("Update range of numbers", async function () {
            // Getting the range
            let maxRange = await lotteryInstance.maxValidRange();
            // Updating range
            await lotteryInstance.connect(owner).updateMaxRange(
                lotto.update.maxValidRange
            );
            // Getting the range after
            let maxRangeAfter = await lotteryInstance.maxValidRange();
            // Testing
            assert.equal(
                maxRange.toString(),
                lotto.setup.maxValidRange,
                "Max range incorrect before update"
            );
            assert.equal(
                maxRangeAfter.toString(),
                lotto.update.maxValidRange,
                "Max range incorrect after update"
            );
        });
        /**
         * Tests that max range cannot be updated to current range
         */
        it("Invalid update size of lottery (same as current)", async function () {
            // Updating range
            await expect(
                lotteryInstance.connect(owner).updateMaxRange(
                    lotto.setup.maxValidRange
                )
            ).to.be.revertedWith(lotto.errors.invalid_size_update_duplicate);
        });
        /**
         * Tests that a non owner cannot change the max range
         */
        it("Invalid update size of lottery (non-owner)", async function () {
            // Updating the size of the lottery
            await expect(
                lotteryInstance.connect(buyer).updateMaxRange(
                    lotto.setup.maxValidRange
                )
            ).to.be.revertedWith(lotto.errors.invalid_admin);
        });
    });

});
