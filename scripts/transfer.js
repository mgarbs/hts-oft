const hre = require("hardhat");

async function main() {
    const [sender] = await ethers.getSigners();

    // Replace these with your actual deployed contract addresses
    const bscOftAddress = "YOUR_BSC_OFT_ADDRESS";
    const hederaOftAddress = "YOUR_HEDERA_OFT_ADDRESS";

    // BSC to Hedera transfer
    const MyOFTV2 = await ethers.getContractFactory("MyOFTV2");
    const bscOft = MyOFTV2.attach(bscOftAddress);

    const amount = ethers.utils.parseUnits("1", 6); // 1 token with 6 decimals
    const hederaChainId = 296; // Hedera Testnet chain ID for LayerZero
    const hederaReceiverAddress = hre.ethers.utils.solidityPack(["address"], [sender.address]);

    console.log("Sending tokens from BSC to Hedera...");
    const bscTx = await bscOft.sendFrom(
        sender.address,
        hederaChainId,
        hederaReceiverAddress,
        amount,
        sender.address,
        ethers.constants.AddressZero,
        "0x",
        { value: ethers.utils.parseEther("0.1") } // Adjust the gas fee as needed
    );
    await bscTx.wait();
    console.log("Tokens sent from BSC to Hedera");

    // Hedera to BSC transfer
    const HTSOFTV2 = await ethers.getContractFactory("HTSOFTV2");
    const hederaOft = HTSOFTV2.attach(hederaOftAddress);

    const bscChainId = 102; // BSC Testnet chain ID for LayerZero
    const bscReceiverAddress = hre.ethers.utils.solidityPack(["address"], [sender.address]);

    console.log("Sending tokens from Hedera to BSC...");
    const hederaTx = await hederaOft.sendFrom(
        sender.address,
        bscChainId,
        bscReceiverAddress,
        amount,
        sender.address,
        ethers.constants.AddressZero,
        "0x",
        { gasLimit: 1000000 } // Adjust the gas limit as needed
    );
    await hederaTx.wait();
    console.log("Tokens sent from Hedera to BSC");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });