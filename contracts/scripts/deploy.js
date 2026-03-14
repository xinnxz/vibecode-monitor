// scripts/deploy.js — SomniaScan Deployment Script
//
// Deploy urutan yang benar:
// 1. ScopeRegistry  (base, tidak ada dependency)
// 2. EventAggregator (base, tidak ada dependency)
// 3. WhaleDetector  (base, tidak ada dependency)
// 4. AlertEngine    (base, tidak ada dependency)
//
// Setelah deploy, tambahkan authorized updaters ke ScopeRegistry.

const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log("======================================================");
  console.log("  SomniaScan — Smart Contract Deployment");
  console.log("======================================================");
  console.log(`Network   : ${network}`);
  console.log(`Deployer  : ${deployer.address}`);
  console.log(`Balance   : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} STT`);
  console.log("======================================================\n");

  // ——————————————————————————————————————————
  // 1. Deploy ScopeRegistry
  // ——————————————————————————————————————————
  console.log("📦 [1/4] Deploying ScopeRegistry...");
  const ScopeRegistry = await ethers.getContractFactory("ScopeRegistry");
  const scopeRegistry = await ScopeRegistry.deploy();
  await scopeRegistry.waitForDeployment();
  const scopeRegistryAddr = await scopeRegistry.getAddress();
  console.log(`   ✅ ScopeRegistry deployed at: ${scopeRegistryAddr}`);

  // ——————————————————————————————————————————
  // 2. Deploy EventAggregator
  // ——————————————————————————————————————————
  console.log("📦 [2/4] Deploying EventAggregator...");
  const EventAggregator = await ethers.getContractFactory("EventAggregator");
  const eventAggregator = await EventAggregator.deploy();
  await eventAggregator.waitForDeployment();
  const eventAggregatorAddr = await eventAggregator.getAddress();
  console.log(`   ✅ EventAggregator deployed at: ${eventAggregatorAddr}`);

  // ——————————————————————————————————————————
  // 3. Deploy WhaleDetector
  // ——————————————————————————————————————————
  console.log("📦 [3/4] Deploying WhaleDetector...");
  const WhaleDetector = await ethers.getContractFactory("WhaleDetector");
  const whaleDetector = await WhaleDetector.deploy();
  await whaleDetector.waitForDeployment();
  const whaleDetectorAddr = await whaleDetector.getAddress();
  console.log(`   ✅ WhaleDetector deployed at: ${whaleDetectorAddr}`);

  // ——————————————————————————————————————————
  // 4. Deploy AlertEngine
  // ——————————————————————————————————————————
  console.log("📦 [4/4] Deploying AlertEngine...");
  const AlertEngine = await ethers.getContractFactory("AlertEngine");
  const alertEngine = await AlertEngine.deploy();
  await alertEngine.waitForDeployment();
  const alertEngineAddr = await alertEngine.getAddress();
  console.log(`   ✅ AlertEngine deployed at: ${alertEngineAddr}`);

  // ——————————————————————————————————————————
  // 5. Setup: Tambahkan WhaleDetector & AlertEngine sebagai authorized updaters ke ScopeRegistry
  // ——————————————————————————————————————————
  console.log("\n⚙️  Setting up authorized updaters...");
  await scopeRegistry.addAuthorizedUpdater(whaleDetectorAddr);
  console.log(`   ✅ WhaleDetector added as authorized updater`);
  await scopeRegistry.addAuthorizedUpdater(alertEngineAddr);
  console.log(`   ✅ AlertEngine added as authorized updater`);

  // ——————————————————————————————————————————
  // 6. Simpan alamat ke file JSON (untuk dipakai frontend)
  // ——————————————————————————————————————————
  const deploymentInfo = {
    network,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      ScopeRegistry: scopeRegistryAddr,
      EventAggregator: eventAggregatorAddr,
      WhaleDetector: whaleDetectorAddr,
      AlertEngine: alertEngineAddr,
    },
  };

  const outputPath = path.join(__dirname, "..", "deployments", `${network}.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n======================================================");
  console.log("  ✅ DEPLOYMENT COMPLETE!");
  console.log("======================================================");
  console.log(JSON.stringify(deploymentInfo.contracts, null, 2));
  console.log(`\n📄 Saved to: ${outputPath}`);
  console.log("\n📌 Next steps:");
  console.log("   1. Verify di Shannon Explorer: https://shannon.somnia.network/");
  console.log("   2. Salin contractAddresses ke frontend/.env.local");
  console.log("   3. Subscribe contract ke Somnia Reactivity: baca dokumentasi Reactivity SDK");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
