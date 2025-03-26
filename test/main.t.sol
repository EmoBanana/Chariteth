// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
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

    // Experience Points and Leveling Test
    function testUserExperienceAndLeveling() public {
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

        vm.deal(donor1, 10 ether);

        // Donate to trigger XP gain
        vm.prank(donor1);
        platform.donate{value: 1 ether}(1);

        // Check user profile
        (uint256 xp, uint256 level) = platform.getUserProfile(donor1);
        
        assertTrue(xp > 0, "User should gain XP");
        assertEq(level, 1, "User should reach level 1");
    }

    // NFT Minting Test
    function testNFTMinting() public {
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
            50 ether,
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

        vm.deal(donor1, 50 ether);

        // Simulate donations to trigger leveling
        for (uint256 i = 0; i < 15; i++) {
            vm.prank(donor1);
            platform.donate{value: 1 ether}(1);
        }

        // Check user level and NFT count
        uint256 nftBalance = platform.balanceOf(donor1);
        
        assertTrue(nftBalance > 0, "User should have minted NFTs");
    }

    function testOwnerAdjustExperiencePointsToLevelUp() public {
        // Initial setup
        vm.prank(admin);
        platform.submitKYC("ownerHash");

        // Owner adjusts experience points
        vm.prank(admin);
        platform.adjustUserExperience(donor1, 500, true);

        // Check user profile after experience adjustment
        (uint256 xp, uint256 level) = platform.getUserProfile(donor1);
        
        assertEq(xp, 500, "XP should be exactly 500");
        assertEq(level, 5, "User should reach level 5");

        // Check NFT balance to ensure NFT was minted at level milestones
        uint256 nftBalance = platform.balanceOf(donor1);
        
        assertTrue(nftBalance > 0, "User should have minted NFTs at level milestones");
    }

    function testOwnerAdjustExperiencePointsAndVerifyNFTMinting() public {
        uint256 expectedNFTCount = 0;

        // Level 1
        vm.prank(admin);
        platform.adjustUserExperience(donor1, 100, true);
        (,uint256 level) = platform.getUserProfile(donor1);
        assertEq(level, 1, "Should be at level 1");
        expectedNFTCount++;
        assertEq(platform.balanceOf(donor1), expectedNFTCount, "Should have 1 NFT at level 1");

        // Level 5
        vm.prank(admin);
        platform.adjustUserExperience(donor1, 400, true);
        (,level) = platform.getUserProfile(donor1);
        assertEq(level, 5, "Should be at level 5");
        expectedNFTCount++;
        assertEq(platform.balanceOf(donor1), expectedNFTCount, "Should have 2 NFTs at level 5");

        // Level 10
        vm.prank(admin);
        platform.adjustUserExperience(donor1, 500, true);
        (,level) = platform.getUserProfile(donor1);
        assertEq(level, 10, "Should be at level 10");
        expectedNFTCount++;
        assertEq(platform.balanceOf(donor1), expectedNFTCount, "Should have 3 NFTs at level 10");

        // Level 15
        vm.prank(admin);
        platform.adjustUserExperience(donor1, 500, true);
        (,level) = platform.getUserProfile(donor1);
        assertEq(level, 15, "Should be at level 15");
        expectedNFTCount++;
        assertEq(platform.balanceOf(donor1), expectedNFTCount, "Should have 4 NFTs at level 15");

        // Verify no additional NFTs are minted
        vm.prank(admin);
        platform.adjustUserExperience(donor1, 600, true);
        uint256 finalNFTBalance = platform.balanceOf(donor1);
        assertEq(finalNFTBalance, expectedNFTCount, "No additional NFTs should be minted");
    }

    function testOwnerCanAdjustProposalTotalVotes() public {
        // Submit KYC for creator
        vm.prank(creator);
        platform.submitKYC("creatorKYC");

        // Create proposal with two milestones
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
            50 ether,
            milestonesTitles,
            milestonesDescriptions,
            milestonePercentages
        );

        // Get the first proposal ID
        uint256 proposalId = 1;

        // Check initial state
        Chariteth.Proposal memory initialProposal = platform.getProposalDetails(proposalId);
        assertEq(initialProposal.totalVotes, 0, "Initial total votes should be 0");
        assertEq(uint256(initialProposal.status), uint256(Chariteth.ProposalStatus.Pending), "Initial status should be Pending");

        // Adjust votes as owner
        vm.prank(admin);
        platform.adjustProposalTotalVotes(proposalId, 20);

        // Verify votes and status
        Chariteth.Proposal memory updatedProposal = platform.getProposalDetails(proposalId);
        assertEq(updatedProposal.totalVotes, 20, "Total votes should be set to 20");
        assertEq(uint256(updatedProposal.status), uint256(Chariteth.ProposalStatus.Active), "Proposal should be activated");

        // Test setting votes below threshold
        vm.prank(admin);
        platform.adjustProposalTotalVotes(proposalId, 10);

        updatedProposal = platform.getProposalDetails(proposalId);
        assertEq(updatedProposal.totalVotes, 10, "Total votes should be set to 10");
        assertEq(uint256(updatedProposal.status), uint256(Chariteth.ProposalStatus.Active), "Proposal should remain active");
    }
}