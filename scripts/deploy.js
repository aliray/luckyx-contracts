// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const ethers = hre.ethers;

const {
    lotto,
    lottoNFT,
    BigNumber,
    generateLottoNumbers
} = require("../test/settings.js");

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');
    // We get the contract to deploy

    const lotteryContract = await ethers.getContractFactory("Lottx");
    const lotteryNftContract = await ethers.getContractFactory("Lottxnft");
    const mock_erc20Contract = await ethers.getContractFactory("Mock_erc20");
    const timerContract = await ethers.getContractFactory("Timer");
    const randGenContract = await ethers.getContractFactory("RandomNumberGenerator");
    const mock_vrfCoordContract = await ethers.getContractFactory("Mock_VRFCoordinator");
    const timerInstance = await timerContract.deploy();
    const usdtinstance = await mock_erc20Contract.deploy(lotto.buy.cake);

    const linkInstance = await mock_erc20Contract.deploy(
        lotto.buy.cake
    );
    const mock_vrfCoordInstance = await mock_vrfCoordContract.deploy(
        linkInstance.address,
        lotto.chainLink.keyHash,
        lotto.chainLink.fee
    );

    const lotteryInstance = await lotteryContract.deploy(
        usdtinstance.address,
        timerInstance.address,
        lotto.setup.sizeOfLottery,
        lotto.setup.maxValidRange,
        lotto.setup.maxNumberTicketsPerBatch
    );
    const randGenInstance = await randGenContract.deploy(
        mock_vrfCoordInstance.address,
        linkInstance.address,
        lotteryInstance.address,
        lotto.chainLink.keyHash,
        lotto.chainLink.fee
    );
    const lotteryNftInstance = await lotteryNftContract.deploy(
        lottoNFT.newLottoNft.uri,
        lotteryInstance.address,
        timerInstance.address
    );

    await lotteryInstance.initialize(
        lotteryNftInstance.address,
        randGenInstance.address
    );
    // Making sure the lottery has some cake
    await usdtinstance.mint(
        lotteryInstance.address,
        lotto.newLotto.prize
    );
    // Sending link to lottery
    await linkInstance.transfer(
        randGenInstance.address,
        lotto.buy.cake
    );

    console.log(">>>>>>>>>>> lottx contract address", lotteryInstance.address)
    console.log(">>>>>>>>>>> lottx usdtinstance address", usdtinstance.address)
    console.log(">>>>>>>>>>> lottx mock_vrfCoordInstance address", mock_vrfCoordInstance.address)
    console.log(">>>>>>>>>>> lottx randGenInstance address", randGenInstance.address)
    console.log(">>>>>>>>>>> lottx lotteryNftInstance address", lotteryNftInstance.address)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(
        () => process.exit(0)
    )
    .catch(
        (error) => {
            console.error(error);
            process.exit(1);
        }
    );
