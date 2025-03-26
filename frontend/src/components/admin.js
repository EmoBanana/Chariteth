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
        const isOwnerAccount =
          ownerAddress.toLowerCase() === account.toLowerCase();

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

  useEffect(() => {
    if (!checkingOwner && !loading) {
      if (!account) {
        navigate("/");
      } else if (!isOwner) {
        navigate("/home");
      }
    }
  }, [checkingOwner, loading, isOwner, account, navigate]);

  const handleAdjustXP = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const xpValue = parseInt(xpAmount, 10);
      if (isNaN(xpValue) || xpValue <= 0) {
        setError("Please enter a valid XP amount");
        return;
      }

      const tx = await contract.adjustUserExperience(
        xpUserAddress,
        xpValue,
        xpAction === "increase"
      );
      await tx.wait();

      setSuccess(
        `Successfully ${xpAction}d ${xpValue} XP for ${xpUserAddress}`
      );

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
      if (!proposalId || !votesToSet) {
        setError("Please fill in all proposal votes adjustment fields");
        return;
      }

      const votesValue = parseInt(votesToSet, 10);
      if (isNaN(votesValue) || votesValue < 0) {
        setError("Please enter a valid votes amount");
        return;
      }

      const tx = await contract.adjustProposalTotalVotes(
        proposalId,
        votesValue
      );
      await tx.wait();

      setSuccess(
        `Successfully set total votes to ${votesValue} for Proposal #${proposalId}`
      );

      setProposalId("");
      setVotesToSet("");
    } catch (err) {
      setError(`Proposal Votes Adjustment Error: ${err.message}`);
      console.error("Proposal Votes Adjustment Error:", err);
    }
  };

  if (loading || checkingOwner) {
    return <div className="admin-loading">Checking permissions...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <div className="admin-header">
          <h1>Admin Control Center</h1>
          <p>Manage user experiences and proposal dynamics</p>
        </div>

        {error && <div className="admin-alert admin-alert-error">{error}</div>}
        {success && (
          <div className="admin-alert admin-alert-success">{success}</div>
        )}

        <div className="admin-grid">
          <div className="admin-card">
            <div className="admin-card-header">
              <h3>Adjust User XP</h3>
              <i className="admin-icon">⭐</i>
            </div>
            <form onSubmit={handleAdjustXP} className="admin-form">
              <div className="admin-form-group">
                <label>User Address</label>
                <input
                  type="text"
                  value={xpUserAddress}
                  onChange={(e) => setXpUserAddress(e.target.value)}
                  placeholder="0x..."
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>XP Amount</label>
                <input
                  type="number"
                  value={xpAmount}
                  onChange={(e) => setXpAmount(e.target.value)}
                  placeholder="Enter XP"
                  min="1"
                  required
                />
              </div>

              <div className="admin-radio-group">
                <label>
                  <input
                    type="radio"
                    value="increase"
                    checked={xpAction === "increase"}
                    onChange={() => setXpAction("increase")}
                  />
                  Increase
                </label>
                <label>
                  <input
                    type="radio"
                    value="decrease"
                    checked={xpAction === "decrease"}
                    onChange={() => setXpAction("decrease")}
                  />
                  Decrease
                </label>
              </div>

              <button
                type="submit"
                className="admin-button"
                disabled={!account}
              >
                {account ? "Adjust XP" : "Connect Wallet"}
              </button>
            </form>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <h3>Adjust Proposal Votes</h3>
              <i className="admin-icon">📊</i>
            </div>
            <form onSubmit={handleAdjustProposalVotes} className="admin-form">
              <div className="admin-form-group">
                <label>Proposal ID</label>
                <input
                  type="number"
                  value={proposalId}
                  onChange={(e) => setProposalId(e.target.value)}
                  placeholder="Enter Proposal ID"
                  min="0"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Total Votes</label>
                <input
                  type="number"
                  value={votesToSet}
                  onChange={(e) => setVotesToSet(e.target.value)}
                  placeholder="Set Vote Count"
                  min="0"
                  required
                />
              </div>

              <button
                type="submit"
                className="admin-button-second"
                disabled={!account}
              >
                {account ? "Set Proposal Votes" : "Connect Wallet"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
