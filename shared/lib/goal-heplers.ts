import { GoalStatus } from "@/entities/goal/model/types";

export function getGoalStatus(progress: number): GoalStatus {
    if (progress === 0) return 'not-started';
    if (progress === 100) return 'completed';
    if (progress >= 60) return 'on-track';
    return 'at-risk';
  }
  