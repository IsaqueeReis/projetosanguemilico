
export type MissionStatus = 'LOCKED' | 'ACTIVE' | 'COMPLETED';

export interface Mission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  icon: 'target' | 'book' | 'skull' | 'trophy' | 'medal';
}

export interface TrilhaState {
  currentMissionId: string;
  completedMissionIds: string[];
}
