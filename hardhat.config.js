require("@nomiclabs/hardhat-waffle");

const moment = require("moment")
const moment_format = "yy MMMM DD h:mm a"
const fs = require("fs");
const { BigNumber } = require("bignumber.js");
moment.locale('zh-cn')
const {
  lotto,
  lottoNFT,
  generateLottoNumbers
} = require("./test/settings.js");
const { time } = require("console");

const lotteryContractAddress = "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c";
const usdtContractAddress = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";
const mock_vrfCoordAddress = "0x68B1D87F95878fE05B998F19b66F4baba5De1aed";
const randGenInstanceAddress = "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d";
const lotteryNftInstanceAddress = "0x59b670e9fA9D0A427751Af201D676719a970857b";

function getContract(name, contractAddress, ethers) {
  let lotxabi = JSON.parse(
    fs.readFileSync(
      "./artifacts/contracts/" + name + ".sol/" + name + ".json"
    )
  ).abi;
  return new ethers.Contract(contractAddress, lotxabi, ethers.getDefaultProvider());
}

task("setTime", "query time", async (taskArgs, { ethers }) => {
  const signers = await ethers.getSigners();
  let owner = signers[0];
  let contract = getContract("Lottx", lotteryContractAddress, ethers);
  let lotteryInstance = await contract.connect(owner);
  let curTime = await lotteryInstance.getCurrentTime()
  console.log(curTime.toNumber())
  console.log(moment(Number(curTime.toNumber())).format(moment_format))
  await lotteryInstance.setCurrentTime(new Date().getTime())
  curTime = await lotteryInstance.getCurrentTime()
  console.log(curTime.toNumber())
  console.log(moment(Number(curTime.toNumber())).format(moment_format))
});

task("getTime", "query time", async (taskArgs, { ethers }) => {
  console.log(new Date())
  console.log(new Date().getDate())
  console.log(new Date().getTime())
  let now = new Date().getTime()
  let now7h = moment(now).add(7, 'h').toDate().getTime() //gettime 为milesecond , 1s = 1000ms
  console.log(moment.now(), now, now7h, now7h - now, (now7h - now) / 1000 / 60)
  console.log(moment(now).format("yy MMMM DD h:mm a"))
  console.log(moment(now7h).format("yy MMMM DD h:mm a"))
  console.log(moment.locale())
});

task("accounts", "query accounts", async (taskArgs, { ethers }) => {
  const signers = await ethers.getSigners();
  signers.forEach(e => {
    console.log(e.address);
  });
});

task("crt", "create new lottery round", async (taskArgs, { ethers }) => {

  const signers = await ethers.getSigners();
  let owner = signers[0];
  let contract = getContract("Lottx", lotteryContractAddress, ethers);
  let lotteryInstance = await contract.connect(owner);

  let currentTime = moment.now();
  let timeStamp = new BigNumber(currentTime.toString());
  let endTime = new BigNumber(moment(currentTime).add(7, 'h').toDate().getTime())
  await lotteryInstance.setCurrentTime(currentTime)
  await lotteryInstance.createNewLott(
    [5, 10, 35, 50],
    ethers.utils.parseUnits("1000", 18),
    ethers.utils.parseUnits("10", 18),
    timeStamp.toString(),
    endTime.toString()
  );

});

task("buy", "buy tickets", async (taskArgs, { ethers }) => {

  const signers = await ethers.getSigners();
  let owner = signers[0];
  let buyer1 = signers[2];

  let usdtContract = getContract("Mock_erc20", usdtContractAddress, ethers);
  let lotteryContract = getContract("Lottx", lotteryContractAddress, ethers);
  let lotteryInstance = lotteryContract.connect(owner);

  let tickets = 10;
  let lotteryId = 1;
  let price = await lotteryInstance.ticketsCost(lotteryId, tickets);

  let ticketNumbers = generateLottoNumbers(
    {
      numberOfTickets: tickets,
      lottoSize: lotto.setup.sizeOfLottery,
      maxRange: lotto.setup.maxValidRange
    }
  );

  await usdtContract.connect(owner).transfer(
    buyer1.address,
    price
  );

  await usdtContract.connect(buyer1).approve(
    lotteryContractAddress,
    price
  );
  await lotteryContract.connect(buyer1).buyLottTickets(
    lotteryId,
    tickets,
    ticketNumbers
  );

});

task("numbers", "create winning numbers", async (taskArgs, { ethers }) => {
  const signers = await ethers.getSigners();

  let owner = signers[0];
  let lotteryId = 1
  let contract = getContract("Lottx", lotteryContractAddress, ethers);
  let vrfContract = getContract("Mock_VRFCoordinator", mock_vrfCoordAddress, ethers);

  let lotteryInstance = contract.connect(owner);
  let vrfContractInstance = vrfContract.connect(owner);


  let currentTime = await lotteryInstance.getCurrentTime();
  await lotteryInstance.setCurrentTime(
    new BigNumber(currentTime.toString()).plus(lotto.newLotto.closeIncrease).toString()
  );

  let tx = await (
    await lotteryInstance.createLuckyNumbers(lotteryId)
  ).wait();

  await vrfContractInstance.callBackWithRandomness(
    tx.events[0].args.requestId.toString(), //requestId
    lotto.draw.random,
    randGenInstanceAddress
  );

});

task("rewards", "claim rewards.", async (taskArgs, { ethers }) => {
  const signers = await ethers.getSigners();

  let owner = signers[0];
  let buyer1 = signers[1];
  let lotteryId = 1

  let lotteryContract = getContract("Lottx", lotteryContractAddress, ethers);
  let lottxnftContract = getContract("Lottxnft", lotteryNftInstanceAddress, ethers);

  let userTicketIds =
    await lottxnftContract
      .connect(owner)
      .getUserTickets(lotteryId, buyer1.address);

  await lotteryContract.connect(buyer1).batchClaimRewards(
    lotteryId,
    userTicketIds
  );

});

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://192.168.0.103:8545",
    },
    gorli: {
      url: "https://goerli.infura.io/v3/816ca225760a4401a8f05b013a53f948",
      accounts: ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"]
    },
    rop: {
      url: "https://ropsten.infura.io/v3/816ca225760a4401a8f05b013a53f948",
      accounts: ["a8d878dd4713fcad4bb38cb3d8ffa740df9f10210c14e60d681798c45d6cccc2"]
    }
  },
  solidity: "0.8.4",
  mocha: {
    timeout: 20000 //mocha test 设置
  }
};
