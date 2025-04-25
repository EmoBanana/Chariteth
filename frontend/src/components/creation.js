import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";
import axios from "axios";
import "./creation.css";

const KYCProposalForm = ({ contract, account }) => {
  const [step, setStep] = useState("kyc");
  const [kycStatus, setKycStatus] = useState({
    isVerified: false,
    verificationTimestamp: 0,
  });

  const [worldIdVerified, setWorldIdVerified] = useState(false);
  const [passportVerified, setpassportVerified] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [kycFormData, setKycFormData] = useState({
    fullName: "",
    identityNumber: "",
    phoneNumber: "",
    email: "",
    socialHandle: "",
    fundraisingCap: "1ETH",
    worldIdVerified: false,
    passportScore: 0,
  });

  const [proposalFormData, setProposalFormData] = useState({
    title: "",
    description: "",
    fundingGoal: "",
    milestones: [{ title: "", description: "", percentage: "" }],
  });

  // Check KYC status on component mount
  useEffect(() => {
    const checkKYCStatus = async () => {
      if (contract && account) {
        try {
          const kycInfo = await contract.kycVerifications(account);
          setKycStatus({
            isVerified: kycInfo.isVerified,
            verificationTimestamp: kycInfo.verificationTimestamp.toNumber(),
          });

          // If already verified, move to proposal form
          if (kycInfo.isVerified) {
            setStep("proposal");
          }
        } catch (error) {
          console.error("Error checking KYC status:", error);
        }
      }
    };

    checkKYCStatus();
  }, [contract, account]);

  const handleKYCInputChange = (e) => {
    const { name, value } = e.target;
    setKycFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProposalInputChange = (e) => {
    const { name, value } = e.target;
    setProposalFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMilestoneChange = (index, e) => {
    const { name, value } = e.target;
    const newMilestones = [...proposalFormData.milestones];
    newMilestones[index][name] = value;
    setProposalFormData((prev) => ({
      ...prev,
      milestones: newMilestones,
    }));
  };

  const addMilestone = () => {
    setProposalFormData((prev) => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        { title: "", description: "", percentage: "" },
      ],
    }));
  };

  const removeMilestone = (index) => {
    const newMilestones = proposalFormData.milestones.filter(
      (_, i) => i !== index
    );
    setProposalFormData((prev) => ({
      ...prev,
      milestones: newMilestones,
    }));
  };

  const verifyProof = async (proof) => {
    console.log("proof", proof);

    try {
      const response = await fetch(
        "https://developer.worldcoin.org/api/v2/verify/app_staging_129259332fd6f93d4fabaadcc5e4ff9d",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...proof, action: "test" }),
        }
      );

      if (response.ok) {
        const { verified } = await response.json();

        if (verified) {
          console.log("Verification successful!");
          onSuccess();
        } else {
          throw new Error("Verification failed");
        }
      } else {
        const { code, detail } = await response.json();
        throw new Error(`Error Code ${code}: ${detail}`);
      }
    } catch (error) {
      console.error("Error during verification:", error);
    }
  };

  const onSuccess = async () => {
    setKycFormData((prevData) => ({
      ...prevData,
      worldIdVerified: true,
    }));
    setWorldIdVerified(true);
    console.log("Verification successful");
  };

  const verifyPassport = async (address) => {
    setIsCalculating(true); // Set the calculating state to true
    setpassportVerified(true); // Reset the passportVerified state to true before calculation

    // Simulate the calculation of the score
    setTimeout(() => {
      // After 1 second, set the passport score and update the button text
      setKycFormData((prevData) => ({
        ...prevData,
        passportScore: 0, // Simulating a low score
      }));
      setpassportVerified(false); // Set passportVerified to false to indicate insufficient score
      setIsCalculating(false); // Set calculating state to false after calculation
      console.log("User's passport score is insufficient.");
    }, 1000); // 1 second delay
  };

  const isKYCFormComplete = () => {
    const {
      fullName,
      email,
      socialHandle,
      fundraisingCap,
      worldIdVerified,
      passportScore,
    } = kycFormData;

    if (!fullName || !email || !socialHandle) return false;
    if (fundraisingCap === "5ETH" && !worldIdVerified) return false;
    if (fundraisingCap === "GT5ETH" && passportScore < 10) return false;

    return true;
  };

  const submitKYC = async (e) => {
    e.preventDefault();

    if (!isKYCFormComplete()) {
      alert(
        "Please complete all required verifications for your selected fundraising cap."
      );
      return;
    }

    try {
      console.log("Contract:", contract);
      console.log("Account:", account);
      const pinataJWT = process.env.REACT_APP_PINATA_JWT;
      console.log(pinataJWT);

      // Create metadata with the full name as the file name
      const metadata = {
        name: kycFormData.fullName, // Use the full name for the file name
      };

      // Prepare the request payload with KYC form data and metadata
      const pinataPayload = {
        pinataMetadata: metadata, // Include metadata
        pinataContent: kycFormData, // The KYC form data (content to be uploaded)
      };

      // Upload KYC data to IPFS
      const pinataResponse = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        pinataPayload,
        {
          headers: {
            name: kycFormData.fullName,
            "Content-Type": "application/json",
            Authorization: `Bearer ${pinataJWT}`,
          },
        }
      );

      // Get the IPFS hash (CID)
      const documentHash = pinataResponse.data.IpfsHash;

      // Submit hash to contract
      const tx = await contract.submitKYC(documentHash);
      await tx.wait();

      // Move to proposal form
      setStep("proposal");
    } catch (error) {
      console.error("KYC Submission Error:", error);
      alert("KYC submission failed: " + error.message);
    }
  };

  const submitProposal = async (e) => {
    e.preventDefault();
    try {
      // Prepare milestone data
      const milestonesTitles = proposalFormData.milestones.map((m) => m.title);
      const milestonesDescriptions = proposalFormData.milestones.map(
        (m) => m.description
      );
      const milestonePercentages = proposalFormData.milestones.map((m) =>
        parseInt(m.percentage)
      );

      // Convert funding goal to wei
      const fundingGoalWei = ethers.utils.parseEther(
        proposalFormData.fundingGoal
      );

      // Submit proposal to contract
      const tx = await contract.createProposal(
        proposalFormData.title,
        proposalFormData.description,
        fundingGoalWei,
        milestonesTitles,
        milestonesDescriptions,
        milestonePercentages
      );
      await tx.wait();

      alert("Proposal successfully submitted!");
      // Reset form
      setKycFormData({
        fullName: "",
        identityNumber: "",
        phoneNumber: "",
        email: "",
        socialHandle: "",
        fundraisingCap: "1ETH",
        worldIdVerified: false,
        passportScore: 0,
      });
      setStep("kyc");
    } catch (error) {
      console.error("Proposal Submission Error:", error);
      alert("Proposal submission failed: " + error.message);
    }
  };

  // KYC Form Render
  const renderKYCForm = () => (
    <form onSubmit={submitKYC} className="kyc-form">
      <h2>KYC Verification</h2>

      <div className="kyc-form-box">
        <div className="form-group">
          <label>Fundraising Cap</label>
          <select
            name="fundraisingCap"
            value={kycFormData.fundraisingCap}
            onChange={handleKYCInputChange}
            required
          >
            <option value="1ETH">1 ETH (Basic Verification)</option>
            <option value="5ETH">5 ETH (World ID Verification)</option>
            <option value="GT5ETH">
              Greater than 5 ETH (Passport.xyz Verification)
            </option>
          </select>
        </div>

        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            name="fullName"
            value={kycFormData.fullName}
            onChange={handleKYCInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={kycFormData.email}
            onChange={handleKYCInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Social Link</label>
          <input
            type="text"
            name="socialHandle"
            value={kycFormData.socialHandle}
            onChange={handleKYCInputChange}
            required
          />
        </div>

        {kycFormData.fundraisingCap === "5ETH" && (
          <div className="verification-section">
            <IDKitWidget
              app_id="app_bf85eec1e5ba26f7e21c481e559cad9b"
              action="create-proposal"
              verification_level={VerificationLevel.Device}
              handleVerify={verifyProof}
              onSuccess={onSuccess}
            >
              {({ open }) => (
                <button onClick={open} disabled={worldIdVerified}>
                  {worldIdVerified
                    ? "Verification Successful"
                    : "Verify with World ID"}
                </button>
              )}
            </IDKitWidget>
          </div>
        )}

        {kycFormData.fundraisingCap === "GT5ETH" && (
          <div className="verification-section">
            <IDKitWidget
              app_id="app_bf85eec1e5ba26f7e21c481e559cad9b"
              action="create-proposal"
              verification_level={VerificationLevel.Device}
              handleVerify={verifyProof}
              onSuccess={onSuccess}
            >
              {({ open }) => (
                <button onClick={open} disabled={worldIdVerified}>
                  {worldIdVerified
                    ? "Verification Successful"
                    : "Verify with World ID"}
                </button>
              )}
            </IDKitWidget>

            <button
              type="button"
              onClick={() => verifyPassport(account)}
              disabled={passportVerified === false || isCalculating}
            >
              {isCalculating
                ? "Calculating Score..."
                : passportVerified
                ? "Verify with Passport.xyz"
                : "Passport Score is insufficient"}
            </button>
          </div>
        )}

        <button
          type="submit"
          className={`submit-btn ${isKYCFormComplete() ? "" : "disabled"}`}
          disabled={!isKYCFormComplete()}
        >
          {isKYCFormComplete ? "Submit KYC" : "Ineligible To Submit KYC"}
        </button>
      </div>
    </form>
  );

  const renderProposalForm = () => (
    <form onSubmit={submitProposal} className="proposal-form">
      <h2>Create Project Proposal</h2>

      <div className="form-group">
        <label>Project Title</label>
        <input
          type="text"
          name="title"
          value={proposalFormData.title}
          onChange={handleProposalInputChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Project Description</label>
        <textarea
          name="description"
          value={proposalFormData.description}
          onChange={handleProposalInputChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Project Tags (Comma separated)</label>
        <input
          type="text"
          name="projectTags"
          placeholder="e.g. Education, Tech, Charity"
        />
      </div>

      <div className="form-group">
        <label>Project Image</label>
        <input type="file" accept="image/*" className="file" />
      </div>

      <div className="form-group">
        <label>Funding Goal (ETH)</label>
        <input
          type="number"
          name="fundingGoal"
          value={proposalFormData.fundingGoal}
          onChange={handleProposalInputChange}
          step="0.1"
          min="0"
          required
        />
      </div>

      <h3>Milestones</h3>
      {proposalFormData.milestones.map((milestone, index) => (
        <div key={index} className="milestone-group">
          <div className="form-group">
            <label>Milestone {index + 1} Title</label>
            <input
              type="text"
              name="title"
              value={milestone.title}
              onChange={(e) => handleMilestoneChange(index, e)}
              required
            />
          </div>

          <div className="form-group">
            <label>Milestone {index + 1} Description</label>
            <textarea
              name="description"
              value={milestone.description}
              onChange={(e) => handleMilestoneChange(index, e)}
              required
            />
          </div>

          <div className="form-group">
            <label>Milestone {index + 1} Percentage</label>
            <input
              type="number"
              name="percentage"
              value={milestone.percentage}
              onChange={(e) => handleMilestoneChange(index, e)}
              min="1"
              max="100"
              required
            />
          </div>

          {proposalFormData.milestones.length > 1 && (
            <button
              type="button"
              onClick={() => removeMilestone(index)}
              className="remove-milestone-btn"
            >
              Remove Milestone
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addMilestone}
        className="add-milestone-btn"
      >
        Add Another Milestone
      </button>

      <button type="submit" className="submit-btn">
        Submit Proposal
      </button>
    </form>
  );

  return (
    <div className="kyc-proposal-container">
      {step === "kyc" ? renderKYCForm() : renderProposalForm()}
    </div>
  );
};

export default KYCProposalForm;
