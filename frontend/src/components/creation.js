import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import axios from "axios";
import "./creation.css";

const KYCProposalForm = ({ contract, account }) => {
  const [step, setStep] = useState("kyc");
  // eslint-disable-next-line
  const [kycStatus, setKycStatus] = useState({
    isVerified: false,
    verificationTimestamp: 0,
  });

  const [kycFormData, setKycFormData] = useState({
    fullName: "",
    identityNumber: "",
    phoneNumber: "",
    email: "",
    socialHandle: "",
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

  const submitKYC = async (e) => {
    e.preventDefault();
    try {
      console.log("Contract:", contract);
      console.log("Account:", account);
      const pinataJWT = process.env.REACT_APP_PINATA_JWT;

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
      renderKYCForm();
    } catch (error) {
      console.error("Proposal Submission Error:", error);
      alert("Proposal submission failed: " + error.message);
    }

    renderKYCForm();
  };

  // KYC Form Render
  const renderKYCForm = () => (
    <form onSubmit={submitKYC} className="kyc-form">
      <h2>KYC Verification</h2>

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
        <label>Identity Number</label>
        <input
          type="text"
          name="identityNumber"
          value={kycFormData.identityNumber}
          onChange={handleKYCInputChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Phone Number</label>
        <input
          type="tel"
          name="phoneNumber"
          value={kycFormData.phoneNumber}
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
        <label>Social Handle</label>
        <input
          type="text"
          name="socialHandle"
          value={kycFormData.socialHandle}
          onChange={handleKYCInputChange}
          required
        />
      </div>

      <button type="submit" className="submit-btn">
        Submit KYC
      </button>
    </form>
  );

  // Proposal Form Render
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
