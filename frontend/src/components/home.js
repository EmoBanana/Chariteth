import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "./walletContext";
import "./proposed.css";

import CharitethABI from "./CharitethABI.json";

const CHARITETH_CONTRACT_ADDRESS = "0x2cCeDa75225400BbCBE2401e52dA15627a93f14a";
const MAX_PROJECTS_TO_FETCH = 3;
const XP_THRESHOLD = ethers.utils.parseEther("0.01"); // 0.01 ETH threshold for 1 XP

const OngoingProjects = () => {
  const { account, provider } = useWallet();
  const [ongoingProjects, setOngoingProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOngoingProjects = async () => {
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

        const projects = [];
        let i = 1;
        let ongoingCount = 0;

        // Fetch details for proposals, stop at 5 ongoing projects or when no more proposals exist
        while (
          i <= MAX_PROJECTS_TO_FETCH &&
          ongoingCount < MAX_PROJECTS_TO_FETCH
        ) {
          try {
            const proposal = await contract.getProposalDetails(i);
            console.log(`Proposal ${i} Details:`, proposal);

            // Filter for active proposals (status 1)
            if (proposal.status === 1 && proposal.title !== "") {
              projects.push({
                id: i,
                title: proposal.title,
                description: proposal.description,
                fundingGoal: proposal.fundingGoal,
                totalRaised: proposal.totalRaised,
                currentMilestone: proposal.currentMilestone,
                creator: proposal.creator,
                creationTime: new Date(
                  proposal.creationTime.toNumber() * 1000
                ).toLocaleDateString("en-GB"),
              });
              ongoingCount++;
            }

            i++; // Move to the next proposal ID
          } catch (proposalError) {
            console.error(`Error fetching proposal ${i}:`, proposalError);
            break; // Break the loop if fetching fails (e.g., proposal does not exist)
          }
        }

        console.log("Ongoing Projects:", projects);
        setOngoingProjects(projects);
        setLoading(false);
      } catch (error) {
        console.error("Error Fetching Projects:", error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchOngoingProjects();
  }, [provider]);

  const handleDonate = async (proposalId) => {
    if (!account) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      const donationAmount = prompt("Enter donation amount in ETH:");
      if (!donationAmount) return;

      const donationWei = ethers.utils.parseEther(donationAmount);

      const contract = new ethers.Contract(
        CHARITETH_CONTRACT_ADDRESS,
        CharitethABI,
        provider.getSigner()
      );

      // Calculate XP based on donation amount
      const xpEarned = Math.floor(
        Number(ethers.utils.formatEther(donationWei)) / 0.01
      );

      const tx = await contract.donate(proposalId, { value: donationWei });
      await tx.wait();

      // Optional: If there's a separate XP tracking method in the contract
      if (contract.awardXP) {
        await contract.awardXP(account, xpEarned);
      }

      alert(`Donation successful! You earned ${xpEarned} XP.`);
    } catch (error) {
      console.error("Donation error:", error);
      alert(`Donation failed: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="loading">Loading ongoing projects...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (ongoingProjects.length === 0) {
    return <div className="no-projects">No ongoing projects found.</div>;
  }

  return (
    <div className="ongoing-projects-container">
      <h1>Ongoing Fundraising Projects</h1>
      <div className="project-grid">
        {ongoingProjects.map((project) => (
          <div key={project.id} className="project-card">
            <div className="project-header">
              <h2>{project.title}</h2>
              <div className="xp-info">
                <span>Earn 1 XP per 0.01 ETH donated</span>
              </div>
            </div>

            <div className="project-summary">
              <p>Creator: {project.creator}</p>
              <p>Created: {project.creationTime}</p>
              <p>
                Funding Goal: {ethers.utils.formatEther(project.fundingGoal)}{" "}
                ETH
              </p>
              <div className="fundraising-progress">
                <p>
                  Raised: {ethers.utils.formatEther(project.totalRaised)} ETH /{" "}
                  {ethers.utils.formatEther(project.fundingGoal)} ETH
                </p>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${
                        (Number(ethers.utils.formatEther(project.totalRaised)) /
                          Number(
                            ethers.utils.formatEther(project.fundingGoal)
                          )) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
              <p>Current Milestone: {Number(project.currentMilestone) + 1}</p>
            </div>

            {project.description && (
              <div className="project-details">
                <p>{project.description}</p>
                <button
                  className="donate-button"
                  onClick={() => handleDonate(project.id)}
                  disabled={!account}
                >
                  {account ? "Donate" : "Connect Wallet"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OngoingProjects;
