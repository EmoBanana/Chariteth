import React, { createContext, useState, useEffect, useContext } from "react";
import { ethers } from "ethers";
import CharitethABI from "./CharitethABI.json"; // Import the ABI of your contract

// Create context
const WalletContext = createContext();

// Provider component
export const WalletProvider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [contract, setContract] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Contract address
  const contractAddress = "0x2cCeDa75225400BbCBE2401e52dA15627a93f14a";

  // Initialize wallet and contract on mount
  useEffect(() => {
    const initWallet = async () => {
      try {
        const isWalletConnected =
          window.localStorage.getItem("walletConnected");

        if (window.ethereum && isWalletConnected === "true") {
          const ethProvider = new ethers.providers.Web3Provider(
            window.ethereum
          );
          const accounts = await ethProvider.send("eth_accounts", []);

          if (accounts.length > 0) {
            setProvider(ethProvider);
            setAccount(accounts[0]);

            // Instantiate the contract with provider and contract address
            const contractInstance = new ethers.Contract(
              contractAddress,
              CharitethABI,
              ethProvider.getSigner() // Use the signer to interact with the contract
            );
            setContract(contractInstance);
          } else {
            window.localStorage.removeItem("walletConnected");
          }
        }
      } catch (err) {
        console.error("Failed to initialize wallet:", err);
        window.localStorage.removeItem("walletConnected");
      } finally {
        setInitialized(true);
      }
    };

    initWallet();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // User disconnected wallet
        setAccount(null);
        window.localStorage.removeItem("walletConnected");
        setContract(null); // Clear contract on disconnect
      } else if (accounts[0] !== account) {
        // Account changed
        setAccount(accounts[0]);
        window.localStorage.setItem("walletConnected", "true");

        // Re-instantiate contract with the new account (signer)
        if (provider) {
          const contractInstance = new ethers.Contract(
            contractAddress,
            CharitethABI,
            provider.getSigner() // Update the signer
          );
          setContract(contractInstance);
        }
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [account, provider]);

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error(
          "No Ethereum wallet detected. Please install a compatible wallet."
        );
      }

      const ethProvider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await ethProvider.send("eth_requestAccounts", []);

      if (accounts.length > 0) {
        setProvider(ethProvider);
        setAccount(accounts[0]);
        window.localStorage.setItem("walletConnected", "true");

        // Instantiate the contract after wallet connection
        const contractInstance = new ethers.Contract(
          contractAddress,
          CharitethABI,
          ethProvider.getSigner()
        );
        setContract(contractInstance);
      } else {
        throw new Error("No accounts found after connection request");
      }
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setAccount(null);
    setContract(null); // Clear contract when the wallet is disconnected
    window.localStorage.removeItem("walletConnected");
  };

  const fetchUserProfile = async () => {
    if (contract && account) {
      try {
        const [experiencePoints, level] = await contract.getUserProfile(
          account
        );
        setUserProfile({
          experiencePoints: experiencePoints.toNumber(),
          level: level.toNumber(),
        });
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
        setUserProfile(null);
      }
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [contract, account]);

  return (
    <WalletContext.Provider
      value={{
        provider,
        account,
        contract,
        isConnecting,
        error,
        initialized,
        userProfile,
        fetchUserProfile,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use the wallet context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
