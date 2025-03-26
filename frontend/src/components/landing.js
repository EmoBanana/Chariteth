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
      icon: "lock",
      title: "Decentralized & Secure",
      description:
        "Built on blockchain technology to ensure transparency, security, and immutability of all predictions and transactions.",
    },
    {
      icon: "coins",
      title: "Low Fees",
      description:
        "Enjoy minimal trading fees compared to traditional prediction platforms, keeping more profits in your wallet.",
    },
    {
      icon: "globe",
      title: "Global Markets",
      description:
        "Access prediction markets covering politics, sports, cryptocurrency, stocks, and many other categories worldwide.",
    },
    {
      icon: "bolt",
      title: "Instant Settlements",
      description:
        "Smart contracts automatically settle markets and distribute rewards as soon as outcomes are determined.",
    },
    {
      icon: "chart-pie",
      title: "Advanced Analytics",
      description:
        "Access powerful tools to analyze market trends, historical data, and make informed predictions.",
    },
    {
      icon: "users",
      title: "Community-Driven",
      description:
        "Create your own markets and participate in a growing community of predictors from around the world.",
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
          <p className="scroll-text">
            <span className="highlight-text">Scroll</span> to learn more
          </p>
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
            How <span className="highlight-text">Scroll</span>&#38;Win Works
          </h2>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-number">1</div>
              <h3 className="feature-title">Create or Join Markets</h3>
              <p className="feature-description">
                Participate in prediction markets ranging from finance and
                politics to sports and entertainment, or create your own
                markets.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-number">2</div>
              <h3 className="feature-title">Place Your Predictions</h3>
              <p className="feature-description">
                Back your insights with cryptocurrency. Our platform uses smart
                contracts to ensure transparent and tamper-proof resolution.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-number">3</div>
              <h3 className="feature-title">Collect Your Winnings</h3>
              <p className="feature-description">
                When the market resolves in your favor, winnings are
                automatically distributed to your wallet. No middlemen, no
                delays.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="choose-section">
        <div className="container">
          <h2 className="section-title">
            Why Choose <span className="highlight-text">Scroll</span>&#38;Win
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
          <h3 className="cta-title">Ready to test your prediction skills?</h3>
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
