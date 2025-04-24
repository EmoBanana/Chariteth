import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { useWallet } from "./walletContext";
import "./home.css";
import MilestoneTracker from "./milestone";

import CharitethABI from "./CharitethABI.json";
import featured from "./featured.json";
import metaData from "./metadata.json";

const CHARITETH_CONTRACT_ADDRESS = "0x2cCeDa75225400BbCBE2401e52dA15627a93f14a";
const MAX_PROJECTS_TO_FETCH = 10;
const XP_THRESHOLD = ethers.utils.parseEther("0.01"); // 0.01 ETH threshold for 1 XP

// Free AI API service - you can replace with your preferred provider
const AI_API_ENDPOINT = "https://api.openai.com/v1/chat/completions";

const OngoingProjects = () => {
  const { account, provider } = useWallet();
  const [ongoingProjects, setOngoingProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProject, setSelectedProject] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [impactScore, setImpactScore] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState("Ongoing");
  const [thankYouMessage, setThankYouMessage] = useState(null);
  const [isThankYouPopupVisible, setIsThankYouPopupVisible] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const carouselRef = useRef(null);

  const extendedFeatured = [...featured, featured[0]];

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

        while (
          i <= MAX_PROJECTS_TO_FETCH &&
          ongoingCount < MAX_PROJECTS_TO_FETCH
        ) {
          try {
            const proposal = await contract.getProposalDetails(i);
            console.log(`Proposal ${i} Details:`, proposal);

            // Filter for active proposals (status 1)
            if (proposal.status === 1 && proposal.title !== "") {
              const milestones = proposal.milestones.map((milestone) => ({
                title: milestone.title,
                description: milestone.description,
                percentage: milestone.percentage.toNumber(),
                fundsAllocated: milestone.fundsAllocated,
                documentHash: milestone.documentHash,
                status: milestone.status,
                submissionTime:
                  milestone.submissionTime.toNumber() > 0
                    ? new Date(
                        milestone.submissionTime.toNumber() * 1000
                      ).toLocaleDateString("en-GB")
                    : null,
                approvalDeadline:
                  milestone.approvalDeadline.toNumber() > 0
                    ? new Date(
                        milestone.approvalDeadline.toNumber() * 1000
                      ).toLocaleDateString("en-GB")
                    : null,
              }));

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
                milestones: milestones,
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

    const interval = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [provider]);

  useEffect(() => {
    if (currentIndex === extendedFeatured.length - 1) {
      const timeout = setTimeout(() => {
        if (carouselRef.current) {
          carouselRef.current.style.transition = "none";
          setCurrentIndex(0);
          setTimeout(() => {
            if (carouselRef.current) {
              carouselRef.current.style.transition =
                "transform 0.5s ease-in-out";
            }
          }, 50);
        }
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, extendedFeatured.length]);

  // Reset AI summary when a new project is selected
  useEffect(() => {
    if (selectedProject) {
      setAiSummary(null);
      setImpactScore(null);
    }
  }, [selectedProject]);

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

      setOngoingProjects((prevProjects) =>
        prevProjects.map((project) =>
          project.id === proposalId
            ? {
                ...project,
                totalRaised: ethers.BigNumber.from(project.totalRaised).add(
                  donationWei
                ),
              }
            : project
        )
      );

      // Generate a thank-you message using AI
      const proposal = ongoingProjects.find(
        (project) => project.id === proposalId
      );
      const message = await generateThankYouMessage(proposal, donationAmount);

      setSelectedProject(null);

      // Show the thank-you popup
      setThankYouMessage(message);
      setIsThankYouPopupVisible(true);

      alert(`Donation successful! You earned ${xpEarned} XP.`);
    } catch (error) {
      console.error("Donation error:", error);
      alert(`Donation failed: ${error.message}`);
    }
  };

  const fake = async (proposalId) => {
    const donationAmount = 0.01;
    const proposal = ongoingProjects.find(
      (project) => project.id === proposalId
    );
    const message = await generateThankYouMessage(proposal, donationAmount);

    // Show the thank-you popup
    setThankYouMessage(message);
    setIsThankYouPopupVisible(true);
  };

  const generateThankYouMessage = async (proposal, donationAmount) => {
    try {
      const response = await fetch(
        "http://localhost:3001/api/generate-thank-you",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: proposal.title,
            description: proposal.description,
            donationAmount,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate thank-you message");
      }

      const data = await response.json();
      return data.message;
    } catch (error) {
      console.error("Error generating thank-you message:", error);
      return "Thank you for your donation!";
    }
  };

  const closeThankYouPopup = () => {
    setIsThankYouPopupVisible(false);
    setThankYouMessage(null);
  };

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % extendedFeatured.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? extendedFeatured.length - 2 : prevIndex - 1
    );
  };

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
        totalRaised: ethers.utils.formatEther(selectedProject.totalRaised),
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

  if (loading) {
    return <div className="home-loading">Loading ongoing projects...</div>;
  }

  if (error) {
    return <div className="home-error">Error: {error}</div>;
  }

  if (ongoingProjects.length === 0) {
    return <div className="home-no-projects">No ongoing projects found.</div>;
  }

  const handleTagClick = (tag) => {
    if (tag === "Ongoing") {
      setSelectedTag("Ongoing"); // Ensure "Ongoing" remains active
    } else {
      setSelectedTag(tag === selectedTag ? "Ongoing" : tag); // Toggle other tags, default back to "Ongoing"
    }
  };

  // Filter projects based on the selected tag
  const filteredProjects =
    selectedTag === "Ongoing"
      ? ongoingProjects // Show all ongoing projects for "Ongoing"
      : ongoingProjects.filter((project) =>
          metaData
            .find((item) => item.id === project.id)
            ?.tags.includes(selectedTag)
        );

  const openPopup = (project) => {
    setSelectedProject(project);
  };

  const closePopup = () => {
    setSelectedProject(null);
    setAiSummary(null);
    setImpactScore(null);
    setShowMilestones(false);
  };

  const metadata = selectedProject
    ? metaData.find((item) => item.id === selectedProject.id)
    : null;

  return (
    <div className="home-ongoing-projects-container">
      <h1 className="home-ongoing-projects-title">
        Ongoing Fundraising Projects
        <div className="home-xp-info">
          <span>Earn 1 XP per 0.01 ETH donated</span>
        </div>
      </h1>
      <div className="home-projects-carousel">
        <button
          className="carousel-nav-button prev"
          onClick={prevSlide}
          aria-label="Previous slide"
        >
          ‹
        </button>
        <div className="home-projects-carousel-inner">
          <div
            className="home-carousel-cards"
            ref={carouselRef}
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {extendedFeatured.map((project, index) => (
              <div
                key={`${project.id}-${index}`}
                className="home-carousel-card"
              >
                <img
                  src={`/${project.image}`}
                  className="carousel-image"
                  alt={project.title}
                />
                <div className="carousel-content">
                  <h2>{project.title}</h2>
                  <p className="carousel-desc">{project.description}</p>
                  <div className="carousel-goal">
                    <p>Funding Goal:</p>
                    <p className="carousel-goal-fund">{project.goal}</p>
                  </div>
                  <button
                    className="home-donate-button"
                    onClick={() => handleDonate(project.id)}
                    disabled={!account}
                  >
                    {account ? "Donate" : "Connect Wallet"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button
          className="carousel-nav-button next"
          onClick={nextSlide}
          aria-label="Next slide"
        >
          ›
        </button>
      </div>

      <div className="tags">
        <div className="tags-container">
          <div
            className={`tag ${selectedTag === "Ongoing" ? "active" : ""}`}
            onClick={() => handleTagClick("Ongoing")}
          >
            Ongoing
          </div>
          {[...new Set(metaData.flatMap((item) => item.tags))].map(
            (tag, index) => (
              <div
                key={index}
                className={`tag ${selectedTag === tag ? "active" : ""}`}
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </div>
            )
          )}
        </div>
      </div>

      <div className="home-project-grid">
        {filteredProjects.map((project) => {
          const metadata = metaData.find((item) => item.id === project.id);

          return (
            <div
              key={project.id}
              className="home-project-card"
              onClick={() => openPopup(project)}
            >
              {metadata?.image && (
                <div className="home-project-image">
                  <img
                    src={metadata.image}
                    alt={`${project.title}`}
                    className="project-image"
                  />
                </div>
              )}

              <div className="home-project-summary">
                <div className="home-project-title">
                  <h1>{project.title}</h1>
                </div>
                <p>
                  Funding Goal: {ethers.utils.formatEther(project.fundingGoal)}{" "}
                  ETH
                </p>
                <div className="home-fundraising-progress">
                  <p>
                    Raised: {ethers.utils.formatEther(project.totalRaised)} ETH
                    / {ethers.utils.formatEther(project.fundingGoal)} ETH
                  </p>
                  <div className="home-progress-bar">
                    <div
                      className="home-progress-bar-fill"
                      style={{
                        width: `${
                          (Number(
                            ethers.utils.formatEther(project.totalRaised)
                          ) /
                            Number(
                              ethers.utils.formatEther(project.fundingGoal)
                            )) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <button
                    className="home-donate-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDonate(project.id);
                    }}
                    disabled={!account}
                  >
                    {account ? "Donate" : "Connect Wallet"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div class="footer-cta">
        <h3>💼 Make Giving a Habit</h3>
        <p>
          Set up recurring donations and get monthly CSR reports — effortless,
          impactful, and transparent.
        </p>
        <a href="/corporate-donation" class="cta-button">
          Start Now
        </a>
      </div>

      {isThankYouPopupVisible && (
        <div className="thank-you-popup-overlay" onClick={closeThankYouPopup}>
          <div
            className="thank-you-popup-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Thank You!</h2>
            <p>{thankYouMessage}</p>
            <button className="close-popup-button" onClick={closeThankYouPopup}>
              Close
            </button>
          </div>
        </div>
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
                <h1>{selectedProject.title}</h1>
                <p>{metadata.desc}</p>
                <p>Creator: {selectedProject.creator}</p>
                <p>
                  Funding Goal:{" "}
                  {ethers.utils.formatEther(selectedProject.fundingGoal)} ETH
                </p>
                <p>
                  Raised:{" "}
                  {ethers.utils.formatEther(selectedProject.totalRaised)} ETH /{" "}
                  {ethers.utils.formatEther(selectedProject.fundingGoal)} ETH
                </p>
                <div className="home-progress-bar">
                  <div
                    className="home-progress-bar-fill"
                    style={{
                      width: `${
                        (Number(
                          ethers.utils.formatEther(selectedProject.totalRaised)
                        ) /
                          Number(
                            ethers.utils.formatEther(
                              selectedProject.fundingGoal
                            )
                          )) *
                        100
                      }%`,
                    }}
                  />
                </div>

                <button
                  className="home-donate-button check-button"
                  onClick={() => setShowMilestones(!showMilestones)}
                >
                  {showMilestones ? "Hide Milestones" : "Check Milestones"}
                </button>

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
                  <button className="home-donate-button">
                    Feature Project
                  </button>
                  <button
                    className="home-donate-button"
                    onClick={() => handleDonate(selectedProject.id)}
                    disabled={!account}
                  >
                    {account ? "Donate" : "Connect Wallet"}
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

            {showMilestones && (
              <div className="milestone-section">
                <h1>Project Milestones</h1>
                <p className="milestone-percent">
                  Current funding progress:{" "}
                  {(Number(
                    ethers.utils.formatEther(selectedProject.totalRaised)
                  ) /
                    Number(
                      ethers.utils.formatEther(selectedProject.fundingGoal)
                    )) *
                    100}
                  %
                </p>

                <div className="milestone-card">
                  <MilestoneTracker
                    milestones={selectedProject.milestones}
                    currentMilestone={selectedProject.currentMilestone}
                    projectId={selectedProject.id}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OngoingProjects;
