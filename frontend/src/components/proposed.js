import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "./walletContext";
import "./proposed.css";

import CharitethABI from "./CharitethABI.json";

const CHARITETH_CONTRACT_ADDRESS = "0x2cCeDa75225400BbCBE2401e52dA15627a93f14a";
const MAX_PROPOSALS_TO_FETCH = 10;

const ProposedProjects = () => {
  const { account, provider } = useWallet();
  const [pendingProposals, setPendingProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPendingProposals = async () => {
      if (!provider) {
        console.log("No provider available");
        setLoading(false);
        return;
      }

      try {
        const contract = new ethers.Contract(
          CHARITETH_CONTRACT_ADDRESS,
          CharitethABI,
          provider
        );

        const proposals = [];
        let i = 1;
        let pendingCount = 0;

        // Fetch details for proposals, stop at 5 pending proposals or when no more proposals exist
        while (
          i <= MAX_PROPOSALS_TO_FETCH &&
          pendingCount < MAX_PROPOSALS_TO_FETCH
        ) {
          try {
            const proposal = await contract.getProposalDetails(i);
            console.log(`Proposal ${i} Details:`, proposal);

            // Filter for pending proposals (status 0)
            if (
              proposal.status === 0 &&
              proposal.title !== "" &&
              proposal.title !== "Test"
            ) {
              proposals.push({
                id: i,
                title: proposal.title,
                description: proposal.description,
                fundingGoal: proposal.fundingGoal,
                totalVotes: proposal.totalVotes,
                creator: proposal.creator,
                creationTime: new Date(
                  proposal.creationTime.toNumber() * 1000
                ).toLocaleDateString("en-GB"),
              });
              pendingCount++;
            }

            i++; // Move to the next proposal ID
          } catch (proposalError) {
            console.error(`Error fetching proposal ${i}:`, proposalError);
            break; // Break the loop if fetching fails (e.g., proposal does not exist)
          }
        }

        console.log("Pending Proposals:", proposals);
        setPendingProposals(proposals);
        setLoading(false);
      } catch (error) {
        console.error("Error Fetching Proposals:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchPendingProposals();
  }, [provider]);

  const handleVote = async (proposalId) => {
    if (!account) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      const contract = new ethers.Contract(
        CHARITETH_CONTRACT_ADDRESS,
        CharitethABI,
        provider.getSigner()
      );

      const tx = await contract.voteOnProposal(proposalId);
      await tx.wait();
      alert("Vote successful!");
    } catch (error) {
      console.error("Voting error:", error);
      alert(`Voting failed: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="loading">Loading proposed projects...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (pendingProposals.length === 0) {
    return <div className="no-proposals">No pending proposals found.</div>;
  }

  return (
    <div className="proposed-projects-container">
      <h1>Pending Proposals Awaiting Votes</h1>
      <div className="proposal-grid">
        {pendingProposals.map((proposal) => (
          <div key={proposal.id} className="proposal-card">
            <div className="proposal-header">
              <h2>{proposal.title}</h2>
            </div>

            <div className="proposal-summary">
              <p>Creator: {proposal.creator}</p>
              <p>Created: {proposal.creationTime}</p>
              <p>
                Funding Goal: {ethers.utils.formatEther(proposal.fundingGoal)}{" "}
                ETH
              </p>
              <div className="vote-progress">
                <p>Votes: {proposal.totalVotes.toString()} / 20 Required</p>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${(proposal.totalVotes.toNumber() / 20) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {proposal.description && (
              <div className="proposal-details">
                <p>{proposal.description}</p>
                <button
                  className="donate-button"
                  onClick={() => handleVote(proposal.id)}
                  disabled={!account}
                >
                  {account ? "Vote" : "Connect Wallet"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProposedProjects;
