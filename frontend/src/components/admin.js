import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "./walletContext";
import "./admin.css";

import CharitethABI from "./CharitethABI.json";

const CHARITETH_CONTRACT_ADDRESS = "0x2cCeDa75225400BbCBE2401e52dA15627a93f14a";

const AdminDashboard = () => {
  const { account, provider } = useWallet();
  const [xpUserAddress, setXpUserAddress] = useState("");
  const [xpAmount, setXpAmount] = useState("");
  const [xpAction, setXpAction] = useState("increase");
  const [proposalId, setProposalId] = useState("");
  const [votesToSet, setVotesToSet] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [contract, setContract] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingOwner, setCheckingOwner] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeContract = async () => {
      if (!provider || !account) {
        return;
      }

      try {
        const signer = provider.getSigner();
        const contractInstance = new ethers.Contract(
          CHARITETH_CONTRACT_ADDRESS,
          CharitethABI,
          signer
        );

        setContract(contractInstance);

        const ownerAddress = await contractInstance.owner();
        console.log(contractInstance.owner());
        const isOwnerAccount =
          ownerAddress.toLowerCase() === account.toLowerCase();
        console.log("Owner check:", {
          ownerAddress,
          account,
          isOwner: isOwnerAccount,
        });

        setIsOwner(isOwnerAccount);
        setCheckingOwner(false);
        setLoading(false);
      } catch (error) {
        console.error("Error initializing contract:", error);
        setCheckingOwner(false);
        setLoading(false);
      }
    };

    initializeContract();
  }, [provider, account]);

  // Only redirect if we've completed the owner check and the user isn't the owner
  useEffect(() => {
    if (!checkingOwner && !loading) {
      // If we don't have an account at all, go to landing page
      if (!account) {
        navigate("/");
      }
      // If we have an account but not owner, go to home page
      else if (!isOwner) {
        navigate("/home");
      }
    }
  }, [checkingOwner, loading, isOwner, account, navigate]);

  const handleAdjustXP = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      // Convert XP amount to number
      const xpValue = parseInt(xpAmount, 10);
      if (isNaN(xpValue) || xpValue <= 0) {
        setError("Please enter a valid XP amount");
        return;
      }

      // Call contract method to adjust XP
      const tx = await contract.adjustUserExperience(
        xpUserAddress,
        xpValue,
        xpAction === "increase"
      );
      await tx.wait();

      setSuccess(
        `Successfully ${xpAction}d ${xpValue} XP for ${xpUserAddress}`
      );

      // Reset XP form
      setXpUserAddress("");
      setXpAmount("");
    } catch (err) {
      setError(`XP Adjustment Error: ${err.message}`);
      console.error("XP Adjustment Error:", err);
    }
  };

  const handleAdjustProposalVotes = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      // Validate inputs
      if (!proposalId || !votesToSet) {
        setError("Please fill in all proposal votes adjustment fields");
        return;
      }

      // Convert votes amount to number
      const votesValue = parseInt(votesToSet, 10);
      if (isNaN(votesValue) || votesValue < 0) {
        setError("Please enter a valid votes amount");
        return;
      }

      // Call contract method to adjust proposal total votes
      const tx = await contract.adjustProposalTotalVotes(
        proposalId,
        votesValue
      );
      await tx.wait();

      setSuccess(
        `Successfully set total votes to ${votesValue} for Proposal #${proposalId}`
      );

      // Reset votes form
      setProposalId("");
      setVotesToSet("");
    } catch (err) {
      setError(`Proposal Votes Adjustment Error: ${err.message}`);
      console.error("Proposal Votes Adjustment Error:", err);
    }
  };

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="dashboard-grid">
        {/* XP Adjustment Section */}
        <div className="dashboard-section">
          <h3>Adjust User XP</h3>
          <form onSubmit={handleAdjustXP}>
            <div className="form-group">
              <label htmlFor="xpUserAddress">User Address:</label>
              <input
                type="text"
                id="xpUserAddress"
                value={xpUserAddress}
                onChange={(e) => setXpUserAddress(e.target.value)}
                placeholder="Enter Ethereum address"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="xpAmount">XP Amount:</label>
              <input
                type="number"
                id="xpAmount"
                value={xpAmount}
                onChange={(e) => setXpAmount(e.target.value)}
                placeholder="Enter XP amount"
                min="1"
                required
              />
            </div>

            <div className="form-group radio-group">
              <label>
                <input
                  type="radio"
                  value="increase"
                  checked={xpAction === "increase"}
                  onChange={() => setXpAction("increase")}
                />
                Increase XP
              </label>
              <label>
                <input
                  type="radio"
                  value="decrease"
                  checked={xpAction === "decrease"}
                  onChange={() => setXpAction("decrease")}
                />
                Decrease XP
              </label>
            </div>

            <button type="submit" className="submit-btn" disabled={!account}>
              {account ? "Adjust XP" : "Connect Wallet First"}
            </button>
          </form>
        </div>

        {/* Proposal Votes Adjustment Section */}
        <div className="dashboard-section">
          <h3>Adjust Proposal Total Votes</h3>
          <form onSubmit={handleAdjustProposalVotes}>
            <div className="form-group">
              <label htmlFor="proposalId">Proposal ID:</label>
              <input
                type="number"
                id="proposalId"
                value={proposalId}
                onChange={(e) => setProposalId(e.target.value)}
                placeholder="Enter Proposal ID"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="votesToSet">Total Votes:</label>
              <input
                type="number"
                id="votesToSet"
                value={votesToSet}
                onChange={(e) => setVotesToSet(e.target.value)}
                placeholder="Enter total votes to set"
                min="0"
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={!account}>
              {account ? "Set Proposal Votes" : "Connect Wallet First"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
