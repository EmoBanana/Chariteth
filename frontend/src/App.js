import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { WalletProvider, useWallet } from "./components/walletContext";
import Landing from "./components/landing";
import Home from "./components/home";
import ProposedProjects from "./components/proposed";
import ProjectCreation from "./components/creation";
import Admin from "./components/admin";
import "./components/navigation.css";

const Navigation = () => {
  const { account, userProfile, connectWallet, disconnectWallet } = useWallet();
  const location = useLocation();
  const navigate = useNavigate();

  // Hide navigation only on landing page
  if (location.pathname === "/") {
    return null;
  }

  const handleDisconnect = () => {
    disconnectWallet();
    navigate("/");
  };

  return (
    <nav className="app-nav">
      <div className="nav-container">
        <div className="nav-links">
          <Link
            to="/home"
            className={`nav-link ${
              location.pathname === "/home" ? "active" : ""
            }`}
          >
            Home
          </Link>
          <Link
            to="/proposed"
            className={`nav-link ${
              location.pathname === "/proposed" ? "active" : ""
            }`}
          >
            Proposed Projects
          </Link>
          <Link
            to="/create"
            className={`nav-link ${
              location.pathname === "/create" ? "active" : ""
            }`}
          >
            Create Proposal
          </Link>
        </div>
        <div className="wallet-connection">
          {account ? (
            <>
              {userProfile && (
                <span className="user-level-xp">
                  Level {userProfile.level} | {userProfile.experiencePoints} XP
                </span>
              )}
              <div className="user-profile">
                <span className="wallet-address">
                  {account.substring(0, 6)}...
                  {account.substring(account.length - 4)}
                </span>
                <button
                  onClick={handleDisconnect}
                  className="btn btn-disconnect"
                >
                  Disconnect
                </button>
              </div>
            </>
          ) : (
            <button onClick={connectWallet} className="btn btn-connect">
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

const App = () => {
  const { account, contract } = useWallet();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/*"
          element={
            <>
              <Navigation />
              <div className="app-content">
                <Routes>
                  <Route path="home" element={<Home />} />
                  <Route path="proposed" element={<ProposedProjects />} />
                  <Route
                    path="create"
                    element={
                      <ProjectCreation contract={contract} account={account} />
                    }
                  />
                  <Route path="admin" element={<Admin />} />
                </Routes>
              </div>
            </>
          }
        />
      </Routes>
    </Router>
  );
};

const AppWrapper = () => {
  return (
    <WalletProvider>
      <App />
    </WalletProvider>
  );
};

export default AppWrapper;
