// oxlint-disable
export async function addArcNetwork(type: "testnet" | "mainnet") {
  // Try every known provider injection point
  const provider =
    typeof window !== "undefined"
      ? ((window as any).okxwallet ||
         (window as any).ethereum ||
         (window as any).web3?.currentProvider)
      : null;

  if (!provider) {
    alert("No Web3 wallet detected. Please install MetaMask or OKX wallet.");
    return false;
  }

  const isTestnet = type === "testnet";
  const chainIdHex = isTestnet ? "0x4CEF52" : "0x13B2"; // 5042002 = 0x4CEF52, 5042 = 0x13B2
  const chainName = isTestnet ? "Arc Testnet" : "Arc Mainnet";
  const rpcUrl = isTestnet ? "https://rpc.testnet.arc.io" : "https://rpc.mainnet.arc.io";
  const explorerUrl = isTestnet ? "https://explorer.testnet.arc.io" : "https://explorer.arc.io";

  const addParams = [{
    chainId: chainIdHex,
    chainName,
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    rpcUrls: [rpcUrl],
    blockExplorerUrls: [explorerUrl],
  }];

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    // Reload so wagmi picks up the new chain cleanly
    window.location.reload();
    return true;
  } catch (switchError: any) {
    if (switchError.code === 4902 ||
        switchError.code === -32603 ||
        switchError?.message?.toLowerCase().includes("unrecognized") ||
        switchError?.message?.toLowerCase().includes("not found") ||
        switchError?.message?.toLowerCase().includes("not exist")) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: addParams,
        });
        // Reload so wagmi picks up the new chain cleanly
        window.location.reload();
        return true;
      } catch (addError) {
        console.error("Failed to add Arc network:", addError);
        alert("Could not add Arc Testnet automatically. Please add it manually:\nRPC: https://rpc.testnet.arc.io\nChain ID: 5042002");
        return false;
      }
    }
    console.error("Failed to switch chain:", switchError);
    return false;
  }
}
