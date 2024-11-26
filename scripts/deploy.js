const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const network = hre.network.name;
  
  if (network === "bscTestnet") {
    const MyOFTV2 = await ethers.getContractFactory("OFTV2");
    const oft = await MyOFTV2.deploy(
      "MyToken",
      "MTK",
      6, // sharedDecimals
      "0x6EDCE65403992e310A62460808c4b910D972f10f" // BSC Testnet LZ Endpoint
    );
    console.log("MyOFTV2 deployed to:", oft.address);
  } else if (network === "hederaTestnet") {

    // Now deploy the HTSOFTV2
    const HTSOFTV2 = await ethers.getContractFactory("HTSOFTV2");
    const htsOft = await HTSOFTV2.deploy(
      "MyToken",
      "MTK",
      6, // sharedDecimals
      "0xbD672D1562Dd32C23B563C989d8140122483631d", // Hedera Testnet LZ Endpoint
      { value: hre.ethers.parseEther("30"), gasLimit: 2000000 }
    );
    console.log("HTSOFTV2 deployed to:", htsOft.address);
  } else {
    console.error("Unsupported network");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });