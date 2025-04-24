import React from "react";
import { ethers } from "ethers";
import { CheckCircle, Clock } from "react-feather";
import overrides from "./milestone.json"; // adjust path if needed
import "./milestone.css";

const MilestoneTracker = ({ milestones, currentMilestone, projectId }) => {
  const getMilestoneStatusText = (statusCode) => {
    switch (Number(statusCode)) {
      case 0:
        return "Pending";
      case 1:
        return "Submitted";
      case 2:
        return "Approved";
      case 3:
        return "Rejected";
      default:
        return "Unknown";
    }
  };

  const overrideData = overrides.find((o) => o.id === projectId);

  const enrichedMilestones = milestones.map((milestone, idx) => {
    const override = overrideData?.milestones?.[idx];
    return {
      ...milestone,
      ...override,
    };
  });

  return (
    <div className="timeline-container">
      <div className="timeline-line"></div>

      {Array.isArray(enrichedMilestones) &&
        enrichedMilestones.map((milestone, index) => {
          const isCompleted = Number(milestone.status) === 2;
          const isPending =
            Number(milestone.status) === 0 || Number(milestone.status) === 1;
          const isCurrent = index === currentMilestone;

          return (
            <div key={index} className="milestone-item">
              <div className="milestone-row">
                <div
                  className={`milestone-icon ${
                    isCompleted ? "icon-completed" : "icon-pending"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle size={20} />
                  ) : (
                    <Clock size={20} />
                  )}
                </div>

                <div className="milestone-details">
                  <div
                    className={`milestone-title ${
                      isCompleted ? "title-completed" : ""
                    }`}
                  >
                    {milestone.title}
                  </div>

                  <div className="milestone-status">
                    <div className="milestone-subtitle">
                      {getMilestoneStatusText(milestone.status)}
                    </div>

                    {isCompleted && (
                      <div className="milestone-timestamp">
                        {milestone.submissionTime || "—"}
                      </div>
                    )}
                  </div>

                  <div>Percentage of Funds: {milestone.percentage}%</div>
                  <div>
                    Funds Allocated:{" "}
                    {ethers.utils.formatEther(milestone.fundsAllocated)} ETH
                  </div>
                </div>

                {isCompleted && milestone.document && (
                  <a
                    href={milestone.document}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="milestone-action"
                  >
                    View Document
                  </a>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default MilestoneTracker;
