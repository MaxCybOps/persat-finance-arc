export async function addArcNetwork(type: "testnet" | "mainnet") {
  if (typeof window === "undefined" || !window.ethereum) {
    alert("MetaMask or Web3 wallet not detected. Please install MetaMask.");
    return false;
  }

  const isTestnet = type === "testnet";
  const chainIdHex = isTestnet ? "0x4CEF72" : "0x13B2"; // 5042002 or 5042
  const chainName = isTestnet ? "Arc Testnet" : "Arc Mainnet";
  const rpcUrl = isTestnet ? "https://rpc.testnet.arc.io" : "https://rpc.arc.io";
  const explorerUrl = isTestnet ? "https://explorer.testnet.arc.io" : "https://explorer.arc.io";

  try {
    // Attempt switch first
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    return true;
  } catch (switchError: any) {
    // Error code 4902 means the chain has not been added to MetaMask yet
    if (switchError.code === 4902 || switchError?.message?.includes("Unrecognized chain")) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainIdHex,
              chainName,
              nativeCurrency: {
                name: "USDC",
                symbol: "USDC",
                decimals: 18,
              },
              rpcUrls: [rpcUrl],
              blockExplorerUrls: [explorerUrl],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add Arc network to MetaMask:", addError);
        return false;
      }
    }
    console.error("Failed to switch chain:", switchError);
    return false;
  }
}
