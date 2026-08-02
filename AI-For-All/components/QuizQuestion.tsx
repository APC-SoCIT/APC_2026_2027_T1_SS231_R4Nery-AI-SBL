import React, { useState } from 'react';
import styles from './QuizQuestion.module.css';

interface QuizQuestionProps {
  question: string;
  options: string[];
  correctIndex: number;
  onAnswered: (isCorrect: boolean, selectedIndex: number) => void;
  disabled?: boolean;
}

export function QuizQuestion({
  question,
  options,
  correctIndex,
  onAnswered,
  disabled = false,
}: QuizQuestionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleOptionClick = (index: number) => {
    if (answered || disabled) return;

    setSelectedIndex(index);
    setAnswered(true);

    const isCorrect = index === correctIndex;
    
    // Call parent handler after a brief delay for animation
    setTimeout(() => {
      onAnswered(isCorrect, index);
    }, 800);
  };

  return (
    <div className={styles.container}>
      <div className={styles.questionBox}>
        <p className={styles.question}>{question}</p>
        
        <div className={styles.optionsContainer}>
          {options.map((option, idx) => {
            const isSelected = selectedIndex === idx;
            const isCorrectOption = idx === correctIndex;
            let optionClass = styles.option;

            if (answered && isSelected) {
              optionClass += ` ${isCorrectOption ? styles.correct : styles.incorrect}`;
            } else if (answered && isCorrectOption && !isSelected) {
              optionClass += ` ${styles.correct}`;
            }

            return (
              <button
                key={idx}
                className={optionClass}
                onClick={() => handleOptionClick(idx)}
                disabled={answered || disabled}
                aria-label={`Option ${idx + 1}: ${option}`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
