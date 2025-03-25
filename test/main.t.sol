// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/main.sol";

contract CharitethTest is Test {
    Chariteth public platform;
    
    // Test accounts
    address public creator;
    address public donor1;
    address public donor2;
    address public admin;

    function setUp() public {
        // Create test accounts
        creator = makeAddr("creator");
        donor1 = makeAddr("donor1");
        donor2 = makeAddr("donor2");
        admin = makeAddr("admin");

        // Deploy the contract
        vm.prank(admin);
        platform = new Chariteth();
    }

    // KYC Verification Tests
    function testKYCVerification() public {
        // Submit KYC for creator
        vm.prank(creator);
        platform.submitKYC("documentHash123");

        // Verify KYC status
        (bool isVerified, string memory documentHash, ) = platform.kycVerifications(creator);
        assertTrue(isVerified, "KYC verification failed");
        assertEq(documentHash, "documentHash123", "Document hash mismatch");
    }

    // Proposal Creation Tests
     function testProposalCreation() public {
        // Verify KYC first
        vm.prank(creator);
        platform.submitKYC("creatorKYC");

        // Prepare milestone details
        string[] memory milestonesTitles = new string[](2);
        milestonesTitles[0] = "Milestone 1";
        milestonesTitles[1] = "Milestone 2";

        string[] memory milestonesDescriptions = new string[](2);
        milestonesDescriptions[0] = "First milestone description";
        milestonesDescriptions[1] = "Second milestone description";

        uint256[] memory milestonePercentages = new uint256[](2);
        milestonePercentages[0] = 60;
        milestonePercentages[1] = 40;

        // Create proposal
        vm.prank(creator);
        platform.createProposal(
            "Test Proposal",
            "Detailed proposal description",
            1 ether,
            milestonesTitles,
            milestonesDescriptions,
            milestonePercentages
        );

        // Get proposal details
        Chariteth.Proposal memory proposal = platform.getProposalDetails(1);
        
        assertEq(proposal.title, "Test Proposal", "Proposal title incorrect");
        assertEq(proposal.creator, creator, "Proposal creator incorrect");
        assertEq(proposal.fundingGoal, 1 ether, "Funding goal incorrect");
        assertEq(uint256(proposal.status), uint256(Chariteth.ProposalStatus.Pending), "Initial proposal status incorrect");
    }

    // Voting on Proposal Tests
    function testProposalVoting() public {
        // Setup: KYC and create proposal
        vm.prank(creator);
        platform.submitKYC("creatorKYC");

        string[] memory milestonesTitles = new string[](2);
        milestonesTitles[0] = "Milestone 1";
        milestonesTitles[1] = "Milestone 2";

        string[] memory milestonesDescriptions = new string[](2);
        milestonesDescriptions[0] = "First milestone description";
        milestonesDescriptions[1] = "Second milestone description";

        uint256[] memory milestonePercentages = new uint256[](2);
        milestonePercentages[0] = 60;
        milestonePercentages[1] = 40;

        vm.prank(creator);
        platform.createProposal(
            "Test Proposal",
            "Detailed proposal description",
            1 ether,
            milestonesTitles,
            milestonesDescriptions,
            milestonePercentages
        );

        // Vote 20 times to activate proposal
        for (uint256 i = 0; i < 20; i++) {
            address voter = makeAddr(string(abi.encodePacked("voter", vm.toString(i))));
            vm.deal(voter, 1 ether);
            vm.prank(voter);
            platform.voteOnProposal(1);
        }

        // Get updated proposal details
        Chariteth.Proposal memory proposal = platform.getProposalDetails(1);
        
        assertEq(uint256(proposal.status), uint256(Chariteth.ProposalStatus.Active), "Proposal not activated");
        assertEq(proposal.totalVotes, 20, "Incorrect total votes");
    }

    // Donation Tests
    function testDonation() public {
        // Setup: KYC, create, and activate proposal
        vm.prank(creator);
        platform.submitKYC("creatorKYC");

        string[] memory milestonesTitles = new string[](2);
        milestonesTitles[0] = "Milestone 1";
        milestonesTitles[1] = "Milestone 2";

        string[] memory milestonesDescriptions = new string[](2);
        milestonesDescriptions[0] = "First milestone description";
        milestonesDescriptions[1] = "Second milestone description";

        uint256[] memory milestonePercentages = new uint256[](2);
        milestonePercentages[0] = 60;
        milestonePercentages[1] = 40;

        vm.prank(creator);
        platform.createProposal(
            "Test Proposal",
            "Detailed proposal description",
            1 ether,
            milestonesTitles,
            milestonesDescriptions,
            milestonePercentages
        );

        // Vote to activate proposal
        for (uint256 i = 0; i < 20; i++) {
            address voter = makeAddr(string(abi.encodePacked("voter", vm.toString(i))));
            vm.deal(voter, 1 ether);
            vm.prank(voter);
            platform.voteOnProposal(1);
        }

        // Donate to proposal
        vm.deal(donor1, 2 ether);
        vm.prank(donor1);
        platform.donate{value: 1 ether}(1);

        // Check donation and user experience
        Chariteth.Proposal memory proposal = platform.getProposalDetails(1);
        (uint256 experiencePoints, uint256 level) = platform.getUserProfile(donor1);

        assertEq(proposal.totalRaised, 1 ether, "Total raised incorrect");
        assertEq(level, 1, "User level incorrect");
        assertTrue(experiencePoints >= 100, "Experience points incorrect");
    }

    // Milestone Submission and Approval Tests
    function testMilestoneSubmissionAndApproval() public {
        // Setup: KYC, create, activate proposal, and donate
        vm.prank(creator);
        platform.submitKYC("creatorKYC");

        string[] memory milestonesTitles = new string[](2);
        milestonesTitles[0] = "Milestone 1";
        milestonesTitles[1] = "Milestone 2";

        string[] memory milestonesDescriptions = new string[](2);
        milestonesDescriptions[0] = "First milestone description";
        milestonesDescriptions[1] = "Second milestone description";

        uint256[] memory milestonePercentages = new uint256[](2);
        milestonePercentages[0] = 60;
        milestonePercentages[1] = 40;

        vm.prank(creator);
        platform.createProposal(
            "Test Proposal",
            "Detailed proposal description",
            1 ether,
            milestonesTitles,
            milestonesDescriptions,
            milestonePercentages
        );

        // Vote to activate proposal
        for (uint256 i = 0; i < 20; i++) {
            address voter = makeAddr(string(abi.encodePacked("voter", vm.toString(i))));
            vm.deal(voter, 1 ether);
            vm.prank(voter);
            platform.voteOnProposal(1);
        }

        // Donate to proposal
        vm.deal(donor1, 2 ether);
        vm.prank(donor1);
        platform.donate{value: 1 ether}(1);

        // Submit milestone document
        vm.prank(creator);
        platform.submitMilestoneDocument(1, 0, "milestone1Hash");

        // Approve milestone
        vm.prank(donor1);
        platform.approveMilestone(1, 0, true);

        // Check milestone status and funds
        Chariteth.Proposal memory proposal = platform.getProposalDetails(1);
        assertEq(
            uint256(proposal.milestones[0].status), 
            uint256(Chariteth.MilestoneStatus.Approved), 
            "Milestone not approved"
        );
        assertEq(proposal.currentMilestone, 1, "Current milestone not updated");
    }

    // Refund Test
    function testRefundForCancelledProposal() public {
        // Setup: KYC, create proposal
        vm.prank(creator);
        platform.submitKYC("creatorKYC");

        string[] memory milestonesTitles = new string[](2);
        milestonesTitles[0] = "Milestone 1";
        milestonesTitles[1] = "Milestone 2";

        string[] memory milestonesDescriptions = new string[](2);
        milestonesDescriptions[0] = "First milestone description";
        milestonesDescriptions[1] = "Second milestone description";

        uint256[] memory milestonePercentages = new uint256[](2);
        milestonePercentages[0] = 60;
        milestonePercentages[1] = 40;

        vm.prank(creator);
        platform.createProposal(
            "Test Proposal",
            "Detailed proposal description",
            1 ether,
            milestonesTitles,
            milestonesDescriptions,
            milestonePercentages
        );

        // Vote to activate proposal
        for (uint256 i = 0; i < 20; i++) {
            address voter = makeAddr(string(abi.encodePacked("voter", vm.toString(i))));
            vm.deal(voter, 1 ether);
            vm.prank(voter);
            platform.voteOnProposal(1);
        }

        // Donate to proposal
        vm.deal(donor1, 2 ether);
        vm.prank(donor1);
        platform.donate{value: 0.5 ether}(1);

        // Cancel proposal
        vm.prank(admin);
        platform.cancelProposal(1, "Test cancellation");

        // Refund donor
        uint256 initialBalance = donor1.balance;
        vm.prank(donor1);
        platform.refundDonors(1);

        assertEq(donor1.balance, initialBalance + 0.5 ether, "Refund amount incorrect");
    }
}