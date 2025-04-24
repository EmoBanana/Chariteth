import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "./walletContext";
import "./proposed.css";
import metaData from "./metadata.json";

import CharitethABI from "./CharitethABI.json";

const CHARITETH_CONTRACT_ADDRESS = "0x2cCeDa75225400BbCBE2401e52dA15627a93f14a";
const MAX_PROPOSALS_TO_FETCH = 10;

const ProposedProjects = () => {
  const { account, provider } = useWallet();
  const [pendingProposals, setPendingProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [impactScore, setImpactScore] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [expiredProposals, setExpiredProposals] = useState([]);

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

        const validProposals = [];
        const expiredProposals = [];
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
            if (proposal.status === 0 && proposal.title !== "") {
              const votingDeadlineDate = new Date(
                proposal.votingDeadline.toNumber() * 1000
              );
              const now = new Date();

              const proposalData = {
                id: i,
                title: proposal.title,
                description: proposal.description,
                fundingGoal: proposal.fundingGoal,
                totalVotes: proposal.totalVotes,
                creator: proposal.creator,
                votingDeadline: votingDeadlineDate,
                creationTime: new Date(proposal.creationTime.toNumber() * 1000),
                totalRaised: proposal.totalRaised,
              };

              if (votingDeadlineDate > now) {
                validProposals.push(proposalData);
                pendingCount++;
              } else {
                expiredProposals.push(proposalData);
              }
            }

            i++; // Move to the next proposal ID
          } catch (proposalError) {
            console.error(`Error fetching proposal ${i}:`, proposalError);
            break; // Break the loop if fetching fails (e.g., proposal does not exist)
          }
        }

        console.log("Pending Proposals:", validProposals);
        console.log("Expired Proposals:", expiredProposals);
        setPendingProposals(validProposals);
        setExpiredProposals(expiredProposals);
        setLoading(false);
      } catch (error) {
        console.error("Error Fetching Proposals:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchPendingProposals();
  }, [provider]);

  useEffect(() => {
    if (selectedProject) {
      setAiSummary(null);
      setImpactScore(null);
    }
  }, [selectedProject]);

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

  const generateAISummary = async () => {
    if (!selectedProject) return;

    setIsSummaryLoading(true);

    try {
      // You would need to replace this with your actual API key
      // Note: For production, NEVER expose API keys in frontend code!
      // Instead, use a backend proxy service to make the API call
      const API_KEY = process.env.REACT_APP_AI_API_KEY;

      const metadata = metaData.find((item) => item.id === selectedProject.id);
      const projectDetails = {
        title: selectedProject.title,
        description: selectedProject.description,
        fundingGoal: ethers.utils.formatEther(selectedProject.fundingGoal),
        totalVotes: ethers.utils.formatEther(selectedProject.totalVotes),
        metadata: metadata ? metadata.desc : "",
        creator: selectedProject.creator,
      };

      // Example using a proxy server to protect your API key
      const response = await fetch(
        "http://localhost:3001/api/generate-summary",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ project: projectDetails }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const data = await response.json();
      console.log("Received data from backend:", data);

      // Example response format from your backend
      // { summary: "...", impactScore: 85 }
      setAiSummary(data.summary);
      setImpactScore(data.impactScore);
    } catch (error) {
      console.error("Error generating AI summary:", error);
      setAiSummary("Failed to generate summary. Please try again later.");
      setImpactScore(null);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const openPopup = (project) => {
    setSelectedProject(project);
  };

  const closePopup = () => {
    setSelectedProject(null);
    setAiSummary(null);
    setImpactScore(null);
  };

  const metadata = selectedProject
    ? metaData.find((item) => item.id === selectedProject.id)
    : null;

  return (
    <div className="proposed-projects-container">
      <h1>Pending Proposals Awaiting Votes</h1>

      {pendingProposals.length === 0 ? (
        <div className="no-proposals">No pending proposals found.</div>
      ) : (
        <div className="proposal-grid">
          {pendingProposals.map((proposal) => {
            const metadata = metaData.find((item) => item.id === proposal.id);

            return (
              <div
                onClick={() => openPopup(proposal)}
                key={proposal.id}
                className="proposal-card"
              >
                {metadata?.image && (
                  <div className="proposed-project-image">
                    <img
                      src={metadata.image}
                      alt={`${proposal.title}`}
                      className="project-image"
                    />
                  </div>
                )}
                <div className="proposal-summary">
                  <div className="proposed-project-title">
                    <h1>{proposal.title}</h1>
                  </div>
                  <p>
                    Voting deadline:{" "}
                    {proposal.votingDeadline.toLocaleDateString("en-GB")}
                  </p>
                  <p>
                    Funding Goal:{" "}
                    {ethers.utils.formatEther(proposal.fundingGoal)} ETH
                  </p>
                  <div className="proposed-vote-progress">
                    <p>Votes: {proposal.totalVotes.toString()} / 20 Required</p>
                    <div className="proposed-progress-bar">
                      <div
                        className="proposed-progress-bar-fill"
                        style={{
                          width: `${
                            (proposal.totalVotes.toNumber() / 20) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <button
                    className="donate-button"
                    onClick={() => handleVote(proposal.id)}
                    disabled={!account}
                  >
                    {account ? "Vote" : "Connect Wallet"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {expiredProposals.length > 0 && (
        <>
          <h1 className="section-title" style={{ marginTop: "3rem" }}>
            Expired Proposals
          </h1>
          <div className="proposal-grid">
            {expiredProposals.map((proposal) => (
              <div key={proposal.id} className="proposal-card-expired">
                <div className="proposed-project-image">
                  <img
                    src={
                      metaData.find((item) => item.id === proposal.id)?.image ||
                      "fallback.jpg"
                    }
                    alt={`${proposal.title}`}
                    className="project-image"
                  />
                </div>
                <div className="proposal-summary">
                  <div className="proposed-project-title">
                    <h1>{proposal.title}</h1>
                  </div>
                  <p>
                    Voting deadline:{" "}
                    {proposal.votingDeadline.toLocaleDateString("en-GB")}
                  </p>
                  <p>
                    Funding Goal:{" "}
                    {ethers.utils.formatEther(proposal.fundingGoal)} ETH
                  </p>
                  <p>Votes: {proposal.totalVotes.toString()} / 20 Required</p>
                  <p className="expired-text">Voting period has ended</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedProject && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-top">
              <button className="popup-close-button" onClick={closePopup}>
                ×
              </button>

              <div className="popup-image">
                <img
                  src={metadata.image}
                  alt={`${selectedProject.title}`}
                ></img>
              </div>

              <div className="popup-summary">
                <h1 className="proposed-popup-title">
                  {selectedProject.title}
                </h1>
                <p className="proposed-popup-desc">{metadata.desc}</p>
                <p>Creator: {selectedProject.creator}</p>
                <p>Voting deadline: {selectedProject.votingDeadline}</p>
                <p>
                  Funding Goal:{" "}
                  {ethers.utils.formatEther(selectedProject.fundingGoal)} ETH
                </p>
                <p>
                  Votes: {selectedProject.totalVotes.toString()}/ 20 Required
                </p>
                <div className="home-progress-bar">
                  <div
                    className="home-progress-bar-fill"
                    style={{
                      width: `${
                        (selectedProject.totalVotes.toNumber() / 20) * 100
                      }%`,
                    }}
                  />
                </div>

                <div className="popup-buttons">
                  <button
                    className="home-donate-button"
                    onClick={generateAISummary}
                    disabled={isSummaryLoading}
                  >
                    {isSummaryLoading
                      ? "Generating..."
                      : aiSummary
                      ? "Regenerate Summary"
                      : "Generate Summary"}
                  </button>
                  <button
                    className="home-donate-button"
                    onClick={() => handleVote(selectedProject.id)}
                    disabled={!account}
                  >
                    {account ? "Vote" : "Connect Wallet"}
                  </button>
                </div>
              </div>
            </div>
            {aiSummary && (
              <div className="ai-summary-container">
                <h3>AI-Generated Summary</h3>
                <p>{aiSummary}</p>

                {impactScore !== null && (
                  <div className="impact-score">
                    <h4>Impact Score</h4>
                    <div className="impact-score-display">
                      <div className="impact-score-value">
                        {impactScore}/100
                      </div>
                      <div className="impact-score-bar">
                        <div
                          className="impact-score-fill"
                          style={{ width: `${impactScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposedProjects;
