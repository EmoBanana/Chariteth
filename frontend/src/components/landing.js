import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "./walletContext";
import { useDencrypt } from "use-dencrypt-effect";
import "./landing.css";

const Landing = () => {
  const { account, isConnecting, error, connectWallet } = useWallet();
  const navigate = useNavigate();

  const values = useMemo(
    () => ["Trust.", "Impact.", "Control.", "Transparency."],
    []
  );
  const [value, setValue] = useDencrypt("Transparency");

  useEffect(() => {
    let i = 0;

    const action = setInterval(() => {
      setValue(values[i]);

      i = i === values.length - 1 ? 0 : i + 1;
    }, 3000);

    return () => clearInterval(action);
  }, [setValue, values]);

  useEffect(() => {
    if (account) {
      const timer = setTimeout(() => {
        navigate("/home");
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [account, navigate]);

  return (
    <div className="landing-container">
      <div className="intro-image-container">
        <div alt="Landing" className="intro-image" />
        <div alt="Landing" className="intro-image" />
        <div alt="Landing" className="intro-image" />
      </div>
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Charit<span className="highlight-text">eth</span>
            </h1>
            <h2 className="hero-desc">
              Empowering Your Donations With {value}
            </h2>
          </div>

          {account ? (
            <div className="wallet-connected">
              <div className="wallet-connected-message">
                Wallet Connected! Redirecting...
              </div>
            </div>
          ) : (
            <div className="connect-wallet-container">
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
        <div className="slider-container">
          <div className="slider">
            <div className="slider-item">
              0x9A102f88fF2C41ECebbfe9306566eF642A08d954 just donated 0.15ETH
            </div>
            <div className="slider-item">
              0x234544cFCD0e8Ebb4f1B8f754C44F9a0612Bf2C4 just donated 0.02ETH
            </div>
            <div className="slider-item">
              0xfE054e920B69e2D6d4D9B41919f13008B82426b5 just donated 0.07ETH
            </div>
            <div className="slider-item">
              0xa5E55529A6D5d845Fd4787fc94FdFCc08470Fd58 just donated 0.1ETH
            </div>
            <div className="slider-item">
              0x7A65eaf6e874E0849aeD1fB329714F46cB5F0149 just donated 0.03ETH
            </div>
            <div className="slider-item">
              0xf4eD7fe12d1abE00Ce1C80712d2A328fC9e8AEeD just donated 0.06ETH
            </div>
            <div className="slider-item">
              0x49999af5D33b07B9EF0BA418B969eb8F29914fAB just donated 0.12ETH
            </div>
            <div className="slider-item">
              0x78109A506336535a6d7677a379064bB8c0dfD79c just donated 0.09ETH
            </div>
            <div className="slider-item">
              0x68f635e7771399C9d9bA9988C15B4eccEfFb4f1D just donated 0.16ETH
            </div>
            <div className="slider-item">
              0x1bd6dEFc3b0ea1F1d5206B77E01d8302dEA955c7 just donated 0.02ETH
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
