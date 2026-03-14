require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    // ============================================================
    // SOMNIA TESTNET (Target utama deployment)
    // Chain ID  : 50312
    // RPC       : https://dream-rpc.somnia.network
    // Token     : STT
    // Faucet    : https://testnet.somnia.network/
    // Explorer  : https://shannon.somnia.network/
    // ============================================================
    somnia_testnet: {
      url: process.env.SOMNIA_RPC_URL || "https://dream-rpc.somnia.network",
      chainId: 50312,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
    },

    // Local development (Hardhat built-in node)
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },

  // Simpan ABI hasil compile agar mudah diakses frontend
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  // Ekspor ABI ke folder yang bisa dibaca frontend
  typechain: {
    outDir: "../frontend/src/lib/typechain",
    target: "ethers-v6",
  },
};
