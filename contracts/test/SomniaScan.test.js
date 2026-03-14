// test/SomniaScan.test.js — Unit Tests untuk semua SomniaScan contracts
//
// Cara menjalankan:
//   cd contracts
//   npx hardhat test
//
// Atau dari root:
//   npm run contracts:test

const { expect } = require("chai");
const { ethers } = require("hardhat");

// ============================================================
// HELPER: simulate _onEvent() call manually untuk testing
// (di produksi, ini dipanggil otomatis oleh Somnia Reactivity)
// ============================================================
function encodeTransferEvent(from, to, amount) {
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "uint256"],
    [from, to, amount]
  );
}

// ============================================================
// TEST SUITE 1: WhaleDetector
// ============================================================
describe("WhaleDetector", function () {
  let whaleDetector;
  let owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const WhaleDetector = await ethers.getContractFactory("WhaleDetector");
    whaleDetector = await WhaleDetector.deploy();
    await whaleDetector.waitForDeployment();
  });

  it("✅ harus memiliki threshold default 100,000 STT", async function () {
    const threshold = await whaleDetector.whaleThreshold();
    expect(threshold).to.equal(ethers.parseEther("100000"));
  });

  it("✅ owner bisa mengubah threshold", async function () {
    const newThreshold = ethers.parseEther("50000");
    await expect(whaleDetector.setWhaleThreshold(newThreshold))
      .to.emit(whaleDetector, "ThresholdUpdated")
      .withArgs(ethers.parseEther("100000"), newThreshold);
    expect(await whaleDetector.whaleThreshold()).to.equal(newThreshold);
  });

  it("❌ non-owner tidak bisa mengubah threshold", async function () {
    await expect(
      whaleDetector.connect(alice).setWhaleThreshold(ethers.parseEther("1"))
    ).to.be.revertedWithCustomError(whaleDetector, "OwnableUnauthorizedAccount");
  });

  it("✅ getThresholdInSTT mengembalikan nilai dalam STT (bukan wei)", async function () {
    const thresholdSTT = await whaleDetector.getThresholdInSTT();
    expect(thresholdSTT).to.equal(100000n);
  });

  it("✅ emit WhaleAlert ketika transfer melampaui threshold", async function () {
    const eventData = encodeTransferEvent(
      alice.address,
      bob.address,
      ethers.parseEther("200000") // > 100,000 threshold
    );

    // Simulate _onEvent() via exposed test function (perlu tambahkan di contract untuk testing)
    // Di sini kita test via direct simulation
    await expect(whaleDetector.simulateEvent(eventData))
      .to.emit(whaleDetector, "WhaleAlert");
  });

  it("✅ tidak emit WhaleAlert untuk transfer kecil", async function () {
    const eventData = encodeTransferEvent(
      alice.address,
      bob.address,
      ethers.parseEther("100") // < 100,000 threshold
    );
    await expect(whaleDetector.simulateEvent(eventData))
      .to.not.emit(whaleDetector, "WhaleAlert");
  });
});

// ============================================================
// TEST SUITE 2: AlertEngine
// ============================================================
describe("AlertEngine", function () {
  let alertEngine;
  let owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const AlertEngine = await ethers.getContractFactory("AlertEngine");
    alertEngine = await AlertEngine.deploy();
    await alertEngine.waitForDeployment();
  });

  it("✅ user bisa membuat alert rule berdasarkan amount", async function () {
    const threshold = ethers.parseEther("500");
    await expect(alertEngine.connect(alice).createAmountAlert(threshold, "Transfer besar!"))
      .to.emit(alertEngine, "RuleCreated")
      .withArgs(1n, alice.address, "Transfer besar!");
  });

  it("✅ user bisa membuat alert rule berdasarkan from address", async function () {
    await expect(
      alertEngine.connect(alice).createFromAddressAlert(bob.address, "Bob bergerak!")
    ).to.emit(alertEngine, "RuleCreated");
  });

  it("✅ alert trigger saat kondisi terpenuhi", async function () {
    await alertEngine.connect(alice).createAmountAlert(ethers.parseEther("100"), "Transfer > 100!");
    const eventData = encodeTransferEvent(bob.address, alice.address, ethers.parseEther("500"));
    await expect(alertEngine.simulateEvent(eventData))
      .to.emit(alertEngine, "AlertTriggered");
  });

  it("✅ user bisa menonaktifkan rule miliknya", async function () {
    await alertEngine.connect(alice).createAmountAlert(ethers.parseEther("100"), "test");
    await expect(alertEngine.connect(alice).deactivateRule(1))
      .to.emit(alertEngine, "RuleDeactivated")
      .withArgs(1n, alice.address);
  });

  it("❌ user lain tidak bisa menonaktifkan rule milik Alice", async function () {
    await alertEngine.connect(alice).createAmountAlert(ethers.parseEther("100"), "test");
    await expect(alertEngine.connect(bob).deactivateRule(1))
      .to.be.revertedWith("Bukan pemilik rule ini");
  });

  it("✅ alert tidak trigger setelah rule dinonaktifkan", async function () {
    await alertEngine.connect(alice).createAmountAlert(ethers.parseEther("100"), "test");
    await alertEngine.connect(alice).deactivateRule(1);
    const eventData = encodeTransferEvent(bob.address, alice.address, ethers.parseEther("500"));
    await expect(alertEngine.simulateEvent(eventData))
      .to.not.emit(alertEngine, "AlertTriggered");
  });
});

// ============================================================
// TEST SUITE 3: EventAggregator
// ============================================================
describe("EventAggregator", function () {
  let aggregator;
  let owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const EventAggregator = await ethers.getContractFactory("EventAggregator");
    aggregator = await EventAggregator.deploy();
    await aggregator.waitForDeployment();
  });

  it("✅ statistik awal bernilai 0", async function () {
    expect(await aggregator.totalTransactions()).to.equal(0);
    expect(await aggregator.totalVolumeWei()).to.equal(0);
    expect(await aggregator.uniqueAddressCount()).to.equal(0);
  });

  it("✅ stats bertambah setelah event masuk", async function () {
    const eventData = encodeTransferEvent(alice.address, bob.address, ethers.parseEther("500"));
    await aggregator.simulateEvent(eventData);
    expect(await aggregator.totalTransactions()).to.equal(1);
    expect(await aggregator.uniqueAddressCount()).to.equal(1);
  });

  it("✅ getTotalVolumeSTT mengembalikan nilai dalam STT", async function () {
    const eventData = encodeTransferEvent(alice.address, bob.address, ethers.parseEther("1000"));
    await aggregator.simulateEvent(eventData);
    expect(await aggregator.getTotalVolumeSTT()).to.equal(1000n);
  });
});

// ============================================================
// TEST SUITE 4: ScopeRegistry
// ============================================================
describe("ScopeRegistry", function () {
  let registry;
  let owner, alice, bob;

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const ScopeRegistry = await ethers.getContractFactory("ScopeRegistry");
    registry = await ScopeRegistry.deploy();
    await registry.waitForDeployment();
  });

  it("✅ user bisa membuat profil", async function () {
    await expect(registry.connect(alice).createProfile("alice_dev", "Seorang developer", ""))
      .to.emit(registry, "ProfileCreated")
      .withArgs(alice.address, "alice_dev", await getBlockTimestamp());
    expect((await registry.profiles(alice.address)).exists).to.be.true;
  });

  it("❌ tidak bisa buat profil dua kali", async function () {
    await registry.connect(alice).createProfile("alice", "bio", "");
    await expect(registry.connect(alice).createProfile("alice2", "bio2", ""))
      .to.be.revertedWith("Profil sudah ada");
  });

  it("✅ user bisa menambahkan ke watchlist", async function () {
    await expect(registry.connect(alice).addToWatchlist(bob.address))
      .to.emit(registry, "WatchlistAdded")
      .withArgs(alice.address, bob.address);
    expect(await registry.isWatching(alice.address, bob.address)).to.be.true;
  });

  it("✅ SBT tidak bisa dipindahtangankan", async function () {
    // Buat profil untuk memicu SBT level 1 (butuh stat yang sudah cukup)
    // Simulasi recordBlockWatched oleh owner (authorized)
    await registry.connect(alice).createProfile("alice", "bio", "");
    await registry.recordBlockWatched(alice.address, 100);

    const tokenId = 1;
    await expect(
      registry.connect(alice).transferFrom(alice.address, bob.address, tokenId)
    ).to.be.revertedWith("SomniaScan SBT: Tidak bisa dipindahtangankan");
  });
});

// Helper
async function getBlockTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp + 1; // Approximate
}
