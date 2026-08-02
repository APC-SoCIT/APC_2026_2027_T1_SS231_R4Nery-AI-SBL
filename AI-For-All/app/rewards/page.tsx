'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/sessionContext';
import { Header } from '@/components/Header';
import { MOCK_REWARDS } from '@/lib/rewardsData';
import styles from './rewards.module.css';

export default function RewardsPage() {
  const router = useRouter();
  const { session, claimReward } = useSession();
  const [claimedRewardId, setClaimedRewardId] = useState<string | null>(null);

  const availableRewards = MOCK_REWARDS.filter(
    (r) => r.pointsCost <= session.totalPoints && !session.claimedRewards.includes(r.id),
  );

  const handleClaim = (rewardId: string) => {
    claimReward(rewardId);
    setClaimedRewardId(rewardId);

    // Show QR code for 3 seconds, then return to options
    setTimeout(() => {
      setClaimedRewardId(null);
    }, 3000);
  };

  const handleHome = () => {
    router.push('/');
  };

  return (
    <>
      <Header title="Rewards" showHome showPoints={session.totalPoints} />
      <main className={styles.container}>
        <div className={styles.content}>
          {availableRewards.length > 0 ? (
            <>
              <p className={styles.intro}>
                You have {session.totalPoints} XP to spend on rewards!
              </p>

              <div className={styles.rewardsList}>
                {availableRewards.map((reward) => (
                  <div key={reward.id} className={styles.rewardCard}>
                    <div className={styles.rewardIcon}>{reward.icon}</div>
                    <div className={styles.rewardInfo}>
                      <h3 className={styles.rewardName}>{reward.name}</h3>
                      <p className={styles.rewardDesc}>{reward.description}</p>
                      <p className={styles.rewardPoints}>{reward.pointsCost} XP</p>
                    </div>
                    <button
                      className={styles.claimBtn}
                      onClick={() => handleClaim(reward.id)}
                      disabled={claimedRewardId !== null && claimedRewardId !== reward.id}
                    >
                      {session.claimedRewards.includes(reward.id) ? 'Claimed ✓' : 'Claim'}
                    </button>
                  </div>
                ))}
              </div>

              {claimedRewardId && (
                <div className={styles.qrConfirmation}>
                  <div className={styles.qrContent}>
                    <h3>Reward Confirmed!</h3>
                    <div className={styles.qrCode}>📱 QR Code Placeholder</div>
                    <p>Your reward is ready. Please scan the QR code.</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.noRewards}>
              <p>🎁 Earn more XP by completing modules to unlock rewards!</p>
              <button className={styles.continueBtn} onClick={handleHome}>
                Continue Learning
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
