'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from '@/lib/sessionContext';
import { getStoryModule, getScene, getChoices } from '@/lib/storyData';
import { Header } from '@/components/Header';
import { MascotDialogue } from '@/components/MascotDialogue';
import { ChoiceButton } from '@/components/ChoiceButton';
import { ProgressBar } from '@/components/ProgressBar';
import { QuizQuestion } from '@/components/QuizQuestion';
import { Choice } from '@/lib/types';
import styles from './story.module.css';

export default function StoryModulePage() {
  const router = useRouter();
  const params = useParams();
  const { session, updateProgress, completeModule } = useSession();
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState(false);

  const moduleId = params.moduleId as string;
  const module = getStoryModule(moduleId);

  useEffect(() => {
    // If user doesn't have a persona or module not found, redirect
    if (!module || !session.selectedPersona) {
      router.push('/persona-selection');
    }
  }, [module, session.selectedPersona, router]);

  if (!module) return null;

  const currentScene = session.currentProgress
    ? getScene(moduleId, session.currentProgress.sceneId)
    : null;

  if (!currentScene) return null;

  const currentSceneIndex = module.scenes.findIndex(
    (s) => s.id === currentScene.id,
  );
  const sceneChoices = getChoices(moduleId, currentScene.id);

  const handleQuizAnswer = (isCorrect: boolean, selectedIndex: number) => {
    setQuizAnswered(true);
    
    // Continue to next scene after quiz answer
    setTimeout(() => {
      const nextChoice = sceneChoices[0]; // Use the first choice to continue
      if (nextChoice) {
        handleChoiceClick(nextChoice);
      }
    }, 1200);
  };

  const handleChoiceClick = (choice: Choice) => {
    if (showFeedback || isTransitioning) return;

    setShowFeedback(choice.id);

    // Show feedback for a moment
    setTimeout(() => {
      setIsTransitioning(true);

      // Navigate to next scene or module
      if (choice.nextSceneId) {
        updateProgress({
          moduleId,
          sceneId: choice.nextSceneId,
          pointsEarned: session.currentProgress?.pointsEarned || 0,
        });
        setShowFeedback(null);
        setIsTransitioning(false);
        setQuizAnswered(false);
      } else if (choice.nextModuleId) {
        // Module complete
        completeModule(moduleId, module.pointsReward, module.unlockedBadge);
        router.push('/progress');
      } else {
        // Shouldn't happen in normal flow
        setIsTransitioning(false);
      }
    }, 1000);
  };

  return (
    <>
      <Header title={module.title} showHome showPoints={session.totalPoints} />
      <main className={styles.container}>
        <div className={styles.content}>
          <ProgressBar
            current={currentSceneIndex + 1}
            total={module.scenes.length}
            label={`Step ${currentSceneIndex + 1} of ${module.scenes.length}`}
          />

          <MascotDialogue
            text={currentScene.dialogueText}
            expression={currentScene.characterExpression}
            avatarEmoji={
              session.selectedPersona === 'avatar-1'
                ? '🧙'
                : session.selectedPersona === 'avatar-2'
                  ? '⚔️'
                  : session.selectedPersona === 'avatar-3'
                    ? '🐉'
                    : '🧝'
            }
          />

          {currentScene.microActivityType === 'multiple-choice' && 
            currentScene.microActivityContent && (
            <QuizQuestion
              question={currentScene.microActivityContent.question}
              options={currentScene.microActivityContent.options}
              correctIndex={currentScene.microActivityContent.correctIndex || 0}
              onAnswered={handleQuizAnswer}
              disabled={quizAnswered || isTransitioning}
            />
          )}

          {!currentScene.microActivityType && (
            <div className={styles.choices}>
              {sceneChoices.map((choice) => (
                <ChoiceButton
                  key={choice.id}
                  text={choice.text}
                  onClick={() => handleChoiceClick(choice)}
                  disabled={isTransitioning || showFeedback !== null}
                  isCorrect={choice.isCorrectPath}
                  showFeedback={showFeedback === choice.id}
                  variant="primary"
                />
              ))}
            </div>
          )}

          {showFeedback && (
            <div className={styles.feedbackMessage}>
              {sceneChoices.find((c) => c.id === showFeedback)?.correctionText ||
                'Great choice! Continuing...'}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
