/* Mock rewards data for AI for ALL */

import { Reward } from './types';

export const MOCK_REWARDS: Reward[] = [
  {
    id: 'reward-1',
    name: 'SM Advantage Points',
    description: 'Earn 500 SM Advantage points redeemable for mall shopping!',
    pointsCost: 300,
    icon: '🎁',
    externalUrl: 'https://www.smadvantage.com',
  },
  {
    id: 'reward-2',
    name: 'Priority Seating Voucher',
    description: 'Get priority seating at your favorite SM mall restaurants and entertainment venues.',
    pointsCost: 250,
    icon: '🎬',
    externalUrl: 'https://www.smmalls.com',
  },
  {
    id: 'reward-3',
    name: 'Digital Avatar Item',
    description: 'Unlock an exclusive virtual item for your avatar collection!',
    pointsCost: 150,
    icon: '🎨',
  },
  {
    id: 'reward-4',
    name: 'Certificate of Completion',
    description: 'Download your official "AI for ALL" learning certificate.',
    pointsCost: 50,
    icon: '📜',
  },
  {
    id: 'reward-5',
    name: 'Free Workshop Pass',
    description: 'Attend a live AI workshop session with expert instructors.',
    pointsCost: 400,
    icon: '🎓',
    externalUrl: 'https://www.ibm.com/skills',
  },
  {
    id: 'reward-6',
    name: 'Exclusive Badge Pack',
    description: 'Unlock 5 special badges for completing the AI for ALL journey.',
    pointsCost: 100,
    icon: '⭐',
  },
];

export function getReward(rewardId: string): Reward | undefined {
  return MOCK_REWARDS.find((r) => r.id === rewardId);
}

export function getAffordableRewards(userPoints: number): Reward[] {
  return MOCK_REWARDS.filter((r) => r.pointsCost <= userPoints);
}
