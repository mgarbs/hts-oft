const hre = require("hardhat");
const { expect } = require("chai");

describe("Cross-chain OFT Tests", function () {
  let bnbOft, hederaOft, bnbSigner, hederaSigner;
  const amount = hre.ethers.utils.parseUnits("100", 6); // 100 tokens with 6 decimals

  before(async function () {
    // Deploy contracts
    const OFTV2 = await hre.ethers.getContractFactory("OFTV2");
    bnbOft = await OFTV2.deploy(
      "MyToken",
      "MTK",
      6,
      "0x3c2269811836af69497E5F486A85D7316753cf62"
    );
    await bnbOft.deployed();
    console.log("BNB OFT deployed to:", bnbOft.address);

    const HederaOFTV2 = await hre.ethers.getContractFactory("HederaOFTV2");
    hederaOft = await HederaOFTV2.deploy(
      "MyToken",
      "MTK",
      6,
      "0x6EDCE65403992e310A62460808c4b910D972f10f" // Replace with actual Hedera LZ endpoint
    );
    await hederaOft.deployed();
    console.log("Hedera OFT deployed to:", hederaOft.address);

    [bnbSigner] = await hre.ethers.getSigners();

    // You'll need to set up a separate Hedera signer here
    // This is a placeholder and won't work as-is
    hederaSigner = new hre.ethers.Wallet(process.env.PRIVATE_KEY_HEDERA, hre.ethers.provider);

    // Set peers
    await bnbOft.setPeer(10001, hre.ethers.utils.hexZeroPad(hederaOft.address, 32)); // Assuming Hedera chain ID is 10001
    await hederaOft.setPeer(97, hre.ethers.utils.hexZeroPad(bnbOft.address, 32)); // BNB Testnet chain ID is 97
    console.log("Peers set for both contracts");
  });

  it("Should mint tokens on BNB and transfer to Hedera", async function () {
    // Log initial balances
    console.log("Initial BNB balance:", (await bnbOft.balanceOf(bnbSigner.address)).toString());
    console.log("Initial Hedera balance:", (await hederaOft.balanceOf(hederaSigner.address)).toString());

    // Mint tokens on BNB
    await bnbOft.mint(bnbSigner.address, amount);
    console.log("Minted on BNB:", amount.toString());

    const bnbBalance = await bnbOft.balanceOf(bnbSigner.address);
    console.log("BNB balance after mint:", bnbBalance.toString());
    expect(bnbBalance).to.equal(amount);

    // Send tokens to Hedera
    await bnbOft.sendFrom(
      bnbSigner.address,
      10001, // Hedera chain ID
      hre.ethers.utils.solidityPack(["address"], [hederaSigner.address]),
      amount,
      bnbSigner.address,
      hre.ethers.constants.AddressZero,
      "0x",
      { value: hre.ethers.utils.parseEther("0.1") } // Send some BNB for gas
    );
    console.log("Tokens sent from BNB to Hedera");

    // Wait for the cross-chain transaction to complete
    console.log("Waiting for cross-chain transaction...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for 1 minute

    // Check balance on Hedera
    const hederaBalance = await hederaOft.balanceOf(hederaSigner.address);
    console.log("Hedera balance after transfer:", hederaBalance.toString());
    expect(hederaBalance).to.equal(amount);

    // Check BNB balance after transfer
    const bnbBalanceAfter = await bnbOft.balanceOf(bnbSigner.address);
    console.log("BNB balance after transfer:", bnbBalanceAfter.toString());
    expect(bnbBalanceAfter).to.equal(0);
  });

  it("Should transfer tokens from Hedera back to BNB", async function () {
    // Log initial balances
    console.log("Initial Hedera balance:", (await hederaOft.balanceOf(hederaSigner.address)).toString());
    console.log("Initial BNB balance:", (await bnbOft.balanceOf(bnbSigner.address)).toString());

    // Send tokens back to BNB
    await hederaOft.connect(hederaSigner).sendFrom(
      hederaSigner.address,
      97, // BNB Testnet chain ID
      hre.ethers.utils.solidityPack(["address"], [bnbSigner.address]),
      amount,
      hederaSigner.address,
      hre.ethers.constants.AddressZero,
      "0x",
      { value: hre.ethers.utils.parseEther("0.1") } // Send some HBAR for gas
    );
    console.log("Tokens sent from Hedera to BNB");

    // Wait for the cross-chain transaction to complete
    console.log("Waiting for cross-chain transaction...");
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for 1 minute

    // Check balance on BNB
    const bnbBalanceAfter = await bnbOft.balanceOf(bnbSigner.address);
    console.log("BNB balance after transfer back:", bnbBalanceAfter.toString());
    expect(bnbBalanceAfter).to.equal(amount);

    // Check Hedera balance after transfer
    const hederaBalanceAfter = await hederaOft.balanceOf(hederaSigner.address);
    console.log("Hedera balance after transfer back:", hederaBalanceAfter.toString());
    expect(hederaBalanceAfter).to.equal(0);
  });
});