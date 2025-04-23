import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { useWallet } from "./walletContext";
import "./home.css";

import CharitethABI from "./CharitethABI.json";
import featured from "./featured.json";
import metaData from "./metadata.json";

const CHARITETH_CONTRACT_ADDRESS = "0x2cCeDa75225400BbCBE2401e52dA15627a93f14a";
const MAX_PROJECTS_TO_FETCH = 10;
const XP_THRESHOLD = ethers.utils.parseEther("0.01"); // 0.01 ETH threshold for 1 XP

const OngoingProjects = () => {
  const { account, provider } = useWallet();
  const [ongoingProjects, setOngoingProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProject, setSelectedProject] = useState(null);
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

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % extendedFeatured.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? extendedFeatured.length - 2 : prevIndex - 1
    );
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

  const openPopup = (project) => {
    setSelectedProject(project);
  };

  const closePopup = () => {
    setSelectedProject(null);
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
      <div className="home-project-grid">
        {ongoingProjects.map((project) => {
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
                    onClick={() => handleDonate(project.id)}
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

      {selectedProject && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close-button" onClick={closePopup}>
              ×
            </button>

            <div className="popup-image">
              <img src={metadata.image} alt={`${selectedProject.title}`}></img>
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
                Raised: {ethers.utils.formatEther(selectedProject.totalRaised)}{" "}
                ETH / {ethers.utils.formatEther(selectedProject.fundingGoal)}{" "}
                ETH
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
                          ethers.utils.formatEther(selectedProject.fundingGoal)
                        )) *
                      100
                    }%`,
                  }}
                />
              </div>

              <div className="popup-buttons">
                <button className="home-donate-button">Generate Summary</button>
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
        </div>
      )}
    </div>
  );
};

export default OngoingProjects;
