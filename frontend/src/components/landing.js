import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "./walletContext";
import "./landing.css";

const Landing = () => {
  const { account, isConnecting, error, connectWallet } = useWallet();
  const marketSectionRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (account) {
      const timer = setTimeout(() => {
        navigate("/home");
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [account, navigate]);

  const scrollToMarket = () => {
    marketSectionRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const choose = [
    {
      title: "Transparency & Accountability",
      description:
        "Funds are released only after charities meet milestones and provide proof, ensuring proper use of donations.",
    },
    {
      title: "Blockchain Security",
      description:
        "Donations are securely stored in tamper-proof smart contracts, with all transactions recorded on the blockchain.",
    },
    {
      title: "DAO Voting System",
      description:
        "Donors participate in project approvals through a decentralized voting system, giving them control over proposed cause.",
    },
    {
      title: "Reward System for Donors",
      description:
        "Donors earn exclusive NFTs and experience points (XP) for their contributions, recognizing their support.",
    },
    {
      title: "Milestone-based Disbursement",
      description:
        "Charities receive funds in stages as they reach milestones, ensuring accountability and progress.",
    },
    {
      title: "KYC Verification for Fundraisers",
      description:
        "A thorough KYC process verifies fundraisers, ensuring only legitimate charities receive donations.",
    },
  ];

  return (
    <div className="landing-container">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Charit<span className="highlight-text">eth</span>
          </h1>

          {account ? (
            <div className="wallet-connected-message">
              Wallet Connected! Redirecting...
            </div>
          ) : (
            <div>
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="connect-button"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>

              {error && <p className="error-message">{error}</p>}
            </div>
          )}
        </div>

        <div className="scroll-indicator" onClick={scrollToMarket}>
          <p className="scroll-text">Learn More</p>
          <svg
            className="scroll-arrow"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </section>

      <section ref={marketSectionRef} className="market-section">
        <div className="market-content">
          <h2 className="section-title">
            How Charit<span className="highlight-text">eth</span> Works
          </h2>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-number">1</div>
              <h3 className="feature-title">Connect & Choose a Cause</h3>
              <p className="feature-description">
                Donors can connect their crypto wallets to the Chariteth
                platform and browse through a list of charity projects. Each
                project includes information such as its goals, milestones, and
                the amount of funding needed. Donors can select causes they are
                passionate about and donate using Ethereum.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-number">2</div>
              <h3 className="feature-title">
                Milestone-based Fund Distribution
              </h3>
              <p className="feature-description">
                Funds are securely held in a blockchain smart contract. As the
                charity achieves specific milestones, such as reaching 25%, 50%,
                or 100% of their goal, funds are released in stages. This
                ensures transparency, as the charity must submit financial
                records, proposals, and proof of work for approval at each
                stage.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-number">3</div>
              <h3 className="feature-title">Vote and Earn Rewards</h3>
              <p className="feature-description">
                For every 0.01 ETH donated, donors earn experience points (XP).
                As donors level up by accumulating XP, they are rewarded with
                unique NFTs. Donors also receive voting rights to help approve
                new charity projects, giving them a say in how the funds are
                allocated.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="choose-section">
        <div className="container">
          <h2 className="section-title">
            Why Choose Charit<span className="highlight-text">eth</span>
          </h2>
          <div className="choose-grid">
            {choose.map((item, index) => (
              <div key={index} className="choose-card">
                <div className="choose-icon">
                  <i className={`fas fa-${item.icon}`}></i>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="cta-container">
          <h3 className="cta-title">Ready to contribute to a cause?</h3>
          <button
            onClick={connectWallet}
            disabled={account || isConnecting}
            className="connect-button"
          >
            {account
              ? "Wallet Connected"
              : isConnecting
              ? "Connecting..."
              : "Connect Wallet"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default Landing;
