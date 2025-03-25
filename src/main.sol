// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "../lib/openzeppelin-contracts/contracts/utils/Counters.sol";

contract Chariteth is ERC721Enumerable, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    // Proposal and Milestone Enums
    enum ProposalStatus { 
        Pending, 
        Active, 
        Cancelled, 
        Completed 
    }

    enum MilestoneStatus { 
        Pending, 
        Submitted, 
        Approved, 
        Rejected 
    }

    // Structs
    struct KYCInfo {
        bool isVerified;
        string documentHash;
        uint256 verificationTimestamp;
    }

    struct Milestone {
        string title;
        string description;
        uint256 percentage;
        uint256 fundsAllocated;
        string documentHash;
        MilestoneStatus status;
        uint256 submissionTime;
        uint256 approvalDeadline;
    }

    struct Proposal {
        address creator;
        string title;
        string description;
        uint256 fundingGoal;
        uint256 totalRaised;
        ProposalStatus status;
        uint256 creationTime;
        uint256 votingDeadline;
        uint256 totalVotes;
        uint256 currentMilestone;
        Milestone[] milestones;
    }

    struct UserProfile {
        uint256 experiencePoints;
        uint256 level;
        mapping(uint256 => bool) nftMilestonesEarned;
    }

    // Mappings
    mapping(uint256 => Proposal) public proposals;
    mapping(address => KYCInfo) public kycVerifications;
    mapping(address => mapping(uint256 => bool)) public hasVoted;
    mapping(address => mapping(uint256 => uint256)) public userDonations;
    mapping(address => UserProfile) public userProfiles;
    mapping(address => mapping(uint256 => mapping(uint256 => bool))) public milestoneApprovals;

    // Counters and Constants
    Counters.Counter private _proposalIds;
    Counters.Counter private _tokenIds;

    // Configuration Constants
    uint256 public constant VOTES_REQUIRED = 20;
    uint256 public constant VOTING_PERIOD = 2 weeks;
    uint256 public constant MILESTONE_SUBMISSION_PERIOD = 2 weeks;
    uint256 public constant MILESTONE_APPROVAL_PERIOD = 3 days;
    uint256 public constant XP_PER_ETH = 1;
    uint256 public constant XP_LEVEL_THRESHOLD = 100;
    uint256[] public NFT_MILESTONE_LEVELS = [1, 5, 10, 15];

    // Events
    event KYCVerified(address indexed user, string documentHash);
    event ProposalCreated(uint256 indexed proposalId, address creator, string title);
    event ProposalVoted(uint256 indexed proposalId, address voter);
    event ProposalActivated(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId, string reason);
    event Donation(uint256 indexed proposalId, address donor, uint256 amount);
    event MilestoneSubmitted(uint256 indexed proposalId, uint256 milestoneIndex, string documentHash);
    event MilestoneApproved(uint256 indexed proposalId, uint256 milestoneIndex);
    event MilestoneRejected(uint256 indexed proposalId, uint256 milestoneIndex, string reason);
    event FundReleased(uint256 indexed proposalId, uint256 milestoneIndex, uint256 amount);
    event LevelUp(address indexed user, uint256 newLevel);
    event NFTAwarded(address indexed user, uint256 tokenId, uint256 level);

    // Constructor
    constructor() 
        ERC721("FundraiserNFT", "FNFT") 
        Ownable(msg.sender) 
    {}

    // KYC Verification
    function submitKYC(string memory _documentHash) external {
        require(bytes(_documentHash).length > 0, "Invalid document hash");
        
        KYCInfo storage kycInfo = kycVerifications[msg.sender];
        kycInfo.isVerified = true;
        kycInfo.documentHash = _documentHash;
        kycInfo.verificationTimestamp = block.timestamp;

        emit KYCVerified(msg.sender, _documentHash);
    }

    // Proposal Creation
    function createProposal(
        string memory _title,
        string memory _description,
        uint256 _fundingGoal,
        string[] memory _milestonesTitles,
        string[] memory _milestonesDescriptions,
        uint256[] memory _milestonePercentages
    ) external {
        // Verify KYC
        require(kycVerifications[msg.sender].isVerified, "KYC not verified");
        
        // Validate milestones
        require(_milestonesTitles.length > 0, "At least one milestone required");
        require(_milestonesTitles.length == _milestonesDescriptions.length, "Milestone details mismatch");
        require(_milestonesTitles.length == _milestonePercentages.length, "Milestone percentages mismatch");
        
        uint256 totalPercentage;
        for (uint256 i = 0; i < _milestonePercentages.length; i++) {
            totalPercentage += _milestonePercentages[i];
        }
        require(totalPercentage == 100, "Milestone percentages must total 100%");

        // Create proposal
        _proposalIds.increment();
        uint256 newProposalId = _proposalIds.current();

        Proposal storage newProposal = proposals[newProposalId];
        newProposal.creator = msg.sender;
        newProposal.title = _title;
        newProposal.description = _description;
        newProposal.fundingGoal = _fundingGoal;
        newProposal.creationTime = block.timestamp;
        newProposal.votingDeadline = block.timestamp + VOTING_PERIOD;
        newProposal.status = ProposalStatus.Pending;

        // Create milestones
        for (uint256 i = 0; i < _milestonesTitles.length; i++) {
            Milestone memory milestone = Milestone({
                title: _milestonesTitles[i],
                description: _milestonesDescriptions[i],
                percentage: _milestonePercentages[i],
                fundsAllocated: (_fundingGoal * _milestonePercentages[i]) / 100,
                documentHash: "",
                status: MilestoneStatus.Pending,
                submissionTime: 0,
                approvalDeadline: 0
            });
            newProposal.milestones.push(milestone);
        }

        emit ProposalCreated(newProposalId, msg.sender, _title);
    }

    // Vote on Proposal
    function voteOnProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        
        require(block.timestamp <= proposal.votingDeadline, "Voting period expired");
        require(!hasVoted[msg.sender][_proposalId], "Already voted");
        require(proposal.status == ProposalStatus.Pending, "Invalid proposal status");

        hasVoted[msg.sender][_proposalId] = true;
        proposal.totalVotes++;

        emit ProposalVoted(_proposalId, msg.sender);

        // Activate proposal if enough votes
        if (proposal.totalVotes >= VOTES_REQUIRED) {
            proposal.status = ProposalStatus.Active;
            emit ProposalActivated(_proposalId);
        }
    }

    // Donate to Proposal
     function donate(uint256 _proposalId) external payable nonReentrant {
        Proposal storage proposal = proposals[_proposalId];
        
        // Allow donations if proposal is active or has met voting requirements
        require(
            proposal.status == ProposalStatus.Active || 
            (proposal.status == ProposalStatus.Pending && 
             proposal.totalVotes >= VOTES_REQUIRED),
            "Proposal not ready for donations"
        );

        // Ensure total raised doesn't exceed funding goal
        require(proposal.totalRaised + msg.value <= proposal.fundingGoal, "Funding goal exceeded");

        // Automatically activate if pending but votes met
        if (proposal.status == ProposalStatus.Pending) {
            proposal.status = ProposalStatus.Active;
        }

        // Track donation
        userDonations[msg.sender][_proposalId] += msg.value;
        proposal.totalRaised += msg.value;

        // Experience points and leveling
        _updateUserExperience(msg.sender, msg.value);

        emit Donation(_proposalId, msg.sender, msg.value);
    }

    // Submit Milestone Document
    function submitMilestoneDocument(
        uint256 _proposalId, 
        uint256 _milestoneIndex, 
        string memory _documentHash
    ) external {
        Proposal storage proposal = proposals[_proposalId];
        
        require(proposal.status == ProposalStatus.Active, "Proposal not active");
        require(msg.sender == proposal.creator, "Only proposal creator can submit");
        require(_milestoneIndex == proposal.currentMilestone, "Invalid milestone");

        Milestone storage milestone = proposal.milestones[_milestoneIndex];
        
        // Check submission deadline
        require(
            block.timestamp <= proposal.milestones[proposal.currentMilestone].submissionTime + MILESTONE_SUBMISSION_PERIOD, 
            "Milestone submission deadline passed"
        );

        milestone.documentHash = _documentHash;
        milestone.status = MilestoneStatus.Submitted;
        milestone.submissionTime = block.timestamp;
        milestone.approvalDeadline = block.timestamp + MILESTONE_APPROVAL_PERIOD;

        emit MilestoneSubmitted(_proposalId, _milestoneIndex, _documentHash);
    }

    // Approve Milestone
    // Modify the milestone approval check to use explicit address conversion
    function approveMilestone(
    uint256 _proposalId, 
    uint256 _milestoneIndex, 
    bool _approve
    ) external {
        Proposal storage proposal = proposals[_proposalId];
        Milestone storage milestone = proposal.milestones[_milestoneIndex];
        
        require(userDonations[msg.sender][_proposalId] > 0, "Not a donor");
        require(milestone.status == MilestoneStatus.Submitted, "Milestone not submitted");
        
        // Use address and uint256 mapping
        require(!milestoneApprovals[msg.sender][_proposalId][_milestoneIndex], "Already voted");

        milestoneApprovals[msg.sender][_proposalId][_milestoneIndex] = true;

        if (_approve) {
            milestone.status = MilestoneStatus.Approved;
            _releaseMilestoneFunds(_proposalId, _milestoneIndex);
            emit MilestoneApproved(_proposalId, _milestoneIndex);
        } else {
            milestone.status = MilestoneStatus.Rejected;
            emit MilestoneRejected(_proposalId, _milestoneIndex, "Donor rejected");
        }
    }
    
    // Release Milestone Funds
    function _releaseMilestoneFunds(uint256 _proposalId, uint256 _milestoneIndex) internal {
        Proposal storage proposal = proposals[_proposalId];
        Milestone storage milestone = proposal.milestones[_milestoneIndex];

        address milestoneRecipient = proposal.creator;
        uint256 fundsToRelease = milestone.fundsAllocated;

        // Transfer funds
        (bool success, ) = milestoneRecipient.call{value: fundsToRelease}("");
        require(success, "Fund transfer failed");

        // Move to next milestone
        proposal.currentMilestone++;

        // Check if all milestones completed
        if (proposal.currentMilestone >= proposal.milestones.length) {
            proposal.status = ProposalStatus.Completed;
        }

        emit FundReleased(_proposalId, _milestoneIndex, fundsToRelease);
    }

    // Refund for Cancelled Proposals
    function refundDonors(uint256 _proposalId) external nonReentrant {
        Proposal storage proposal = proposals[_proposalId];
        
        require(
            proposal.status == ProposalStatus.Cancelled || 
            (proposal.status == ProposalStatus.Pending && 
            block.timestamp > proposal.votingDeadline && 
            proposal.totalVotes < VOTES_REQUIRED),
            "Proposal not eligible for refund"
        );

        uint256 donorRefund = userDonations[msg.sender][_proposalId];
        require(donorRefund > 0, "No donations to refund");

        // Reset donation
        userDonations[msg.sender][_proposalId] = 0;

        // Transfer refund
        (bool success, ) = msg.sender.call{value: donorRefund}("");
        require(success, "Refund transfer failed");
    }


    // Cancel Proposal
    function cancelProposal(uint256 _proposalId, string memory _reason) external {
        Proposal storage proposal = proposals[_proposalId];
        
        require(
            msg.sender == proposal.creator || 
            msg.sender == owner() || 
            (proposal.status == ProposalStatus.Pending && 
             block.timestamp > proposal.votingDeadline && 
             proposal.totalVotes < VOTES_REQUIRED) ||
            (proposal.status == ProposalStatus.Active && 
             block.timestamp > proposal.milestones[proposal.currentMilestone].submissionTime + MILESTONE_SUBMISSION_PERIOD),
            "Cannot cancel proposal"
        );

        proposal.status = ProposalStatus.Cancelled;
        emit ProposalCancelled(_proposalId, _reason);
    }

    // Update User Experience
    function _updateUserExperience(address _donor, uint256 _donationAmount) internal {
        UserProfile storage userProfile = userProfiles[_donor];
        
        // Calculate XP
        uint256 xpEarned = (_donationAmount / 0.01 ether) * XP_PER_ETH;
        userProfile.experiencePoints += xpEarned;

        // Level up mechanism
        while (userProfile.experiencePoints >= (userProfile.level + 1) * XP_LEVEL_THRESHOLD) {
            userProfile.level++;
            emit LevelUp(_donor, userProfile.level);
            _checkAndAwardNFT(_donor);
        }
    }

    // Award NFT
    function _checkAndAwardNFT(address _user) internal {
        UserProfile storage userProfile = userProfiles[_user];
        
        for (uint256 i = 0; i < NFT_MILESTONE_LEVELS.length; i++) {
            if (
                userProfile.level == NFT_MILESTONE_LEVELS[i] && 
                !userProfile.nftMilestonesEarned[NFT_MILESTONE_LEVELS[i]]
            ) {
                _tokenIds.increment();
                uint256 newTokenId = _tokenIds.current();
                
                _safeMint(_user, newTokenId);
                userProfile.nftMilestonesEarned[NFT_MILESTONE_LEVELS[i]] = true;
                
                emit NFTAwarded(_user, newTokenId, NFT_MILESTONE_LEVELS[i]);
            }
        }
    }

    // Utility Functions
    function getProposalDetails(uint256 _proposalId) external view returns (Proposal memory) {
        return proposals[_proposalId];
    }

    function getUserProfile(address _user) external view returns (uint256 experiencePoints, uint256 level) {
        UserProfile storage userProfile = userProfiles[_user];
        return (userProfile.experiencePoints, userProfile.level);
    }

    // Fallback and Receive Functions
    receive() external payable {}
    fallback() external payable {}
}