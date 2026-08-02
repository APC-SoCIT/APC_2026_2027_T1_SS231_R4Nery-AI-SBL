/* Mock story modules for AI for ALL */

import { StoryModule } from './types';

export const MOCK_STORY_MODULES: StoryModule[] = [
  {
    id: 'module-1',
    title: 'Welcome to AI',
    topic: 'Introduction to AI',
    description: 'Learn the basics of Artificial Intelligence and what makes it special.',
    pointsReward: 100,
    estimatedTime: 3,
    unlockedBadge: {
      id: 'badge-1',
      name: 'AI Rookie',
      icon: '🤖',
    },
    scenes: [
      {
        id: 'scene-1-1',
        dialogueText: 'Hey there! I\'m your AI guide. Welcome to the world of Artificial Intelligence! 🎉\n\nToday, we\'re going to explore what AI really is and how it\'s changing the world. Are you ready?',
        characterExpression: 'happy',
      },
      {
        id: 'scene-1-2',
        dialogueText: 'Think of AI like a super-smart assistant. Just like you learn from experience, AI systems learn from lots of data!\n\nHere\'s a fun fact: AI is already helping doctors, teachers, and even farmers make better decisions every day.',
        characterExpression: 'encouraging',
      },
      {
        id: 'scene-1-3',
        dialogueText: 'Now, let me ask you something: What do you think AI should be used for?',
        characterExpression: 'thinking',
        microActivityType: 'multiple-choice',
        microActivityContent: {
          question: 'Which of these is a real use of AI today?',
          options: [
            'Recommending movies on streaming apps',
            'Controlling weather patterns',
            'Reading your mind',
            'Time travel',
          ],
          correctIndex: 0,
        },
      },
      {
        id: 'scene-1-4',
        dialogueText: 'Exactly! AI helps recommend movies, products, and more based on what you like. That\'s machine learning in action!',
        characterExpression: 'happy',
      },
      {
        id: 'scene-1-5',
        dialogueText: 'You\'ve completed your first AI lesson! 🌟 You earned 100 XP and unlocked the "AI Rookie" badge.\n\nReady to explore more? Let\'s keep going!',
        characterExpression: 'encouraging',
      },
    ],
    choices: {
      'scene-1-1': [
        {
          id: 'choice-1-1-1',
          text: 'Yes! Let\'s dive in! 🚀',
          nextSceneId: 'scene-1-2',
        },
        {
          id: 'choice-1-1-2',
          text: 'Tell me more first',
          nextSceneId: 'scene-1-2',
        },
      ],
      'scene-1-2': [
        {
          id: 'choice-1-2-1',
          text: 'That\'s amazing! What else?',
          nextSceneId: 'scene-1-3',
        },
      ],
      'scene-1-3': [
        {
          id: 'choice-1-3-1',
          text: 'Recommending movies',
          nextSceneId: 'scene-1-4',
          isCorrectPath: true,
        },
        {
          id: 'choice-1-3-2',
          text: 'Controlling weather',
          nextSceneId: 'scene-1-4',
          isCorrectPath: false,
          correctionText: 'Not quite! While AI is powerful, controlling weather is still science fiction. But AI does help weather forecasting! 🌦️',
        },
      ],
      'scene-1-4': [
        {
          id: 'choice-1-4-1',
          text: 'Next lesson →',
          nextSceneId: 'scene-1-5',
        },
      ],
      'scene-1-5': [
        {
          id: 'choice-1-5-1',
          text: 'Continue',
          nextModuleId: 'module-2',
        },
      ],
    },
  },

  {
    id: 'module-2',
    title: 'Machine Learning Magic',
    topic: 'How Machine Learning Works',
    description: 'Discover how machines learn from data to make predictions.',
    pointsReward: 150,
    estimatedTime: 4,
    unlockedBadge: {
      id: 'badge-2',
      name: 'ML Master',
      icon: '🧠',
    },
    scenes: [
      {
        id: 'scene-2-1',
        dialogueText: 'Welcome back! Now let\'s talk about Machine Learning—a powerful type of AI.\n\nMachine Learning is when computers learn patterns from lots of examples, instead of being programmed with every rule.',
        characterExpression: 'encouraging',
      },
      {
        id: 'scene-2-2',
        dialogueText: 'Here\'s an example: Imagine teaching a child to recognize cats by showing them 1,000 cat photos. After a while, they can spot a cat even if it\'s different from the ones they saw before!\n\nMachine Learning works the same way.',
        characterExpression: 'happy',
      },
      {
        id: 'scene-2-3',
        dialogueText: 'What do you think happens after a machine learns from data?',
        characterExpression: 'thinking',
        microActivityType: 'multiple-choice',
        microActivityContent: {
          question: 'After learning from data, what can a machine do?',
          options: [
            'Make predictions on new data it hasn\'t seen before',
            'Forget everything it learned',
            'Stop working',
            'Only work with the exact data it trained on',
          ],
          correctIndex: 0,
        },
      },
      {
        id: 'scene-2-4',
        dialogueText: 'Perfect! The machine can now make predictions on new data. This is how email spam filters learn to spot spam, and how recommendation systems know what you might like!',
        characterExpression: 'happy',
      },
      {
        id: 'scene-2-5',
        dialogueText: 'You\'ve mastered the basics of Machine Learning! 🎓 You earned 150 XP and unlocked the "ML Master" badge!\n\nYou\'re becoming an AI expert!',
        characterExpression: 'encouraging',
      },
    ],
    choices: {
      'scene-2-1': [
        {
          id: 'choice-2-1-1',
          text: 'Show me how',
          nextSceneId: 'scene-2-2',
        },
      ],
      'scene-2-2': [
        {
          id: 'choice-2-2-1',
          text: 'I get it! Continue →',
          nextSceneId: 'scene-2-3',
        },
      ],
      'scene-2-3': [
        {
          id: 'choice-2-3-1',
          text: 'Make predictions!',
          nextSceneId: 'scene-2-4',
          isCorrectPath: true,
        },
        {
          id: 'choice-2-3-2',
          text: 'Forget everything',
          nextSceneId: 'scene-2-4',
          isCorrectPath: false,
          correctionText: 'Not quite! Machines keep what they learned. They use it to make smart predictions on new data! 🎯',
        },
      ],
      'scene-2-4': [
        {
          id: 'choice-2-4-1',
          text: 'Next lesson →',
          nextSceneId: 'scene-2-5',
        },
      ],
      'scene-2-5': [
        {
          id: 'choice-2-5-1',
          text: 'Continue',
          nextModuleId: 'module-3',
        },
      ],
    },
  },

  {
    id: 'module-3',
    title: 'Generative AI Unlocked',
    topic: 'Generative AI and Language Models',
    description: 'Explore the AI that can create text, images, and more.',
    pointsReward: 200,
    estimatedTime: 5,
    unlockedBadge: {
      id: 'badge-3',
      name: 'Creator AI Expert',
      icon: '✨',
    },
    scenes: [
      {
        id: 'scene-3-1',
        dialogueText: 'Congratulations on reaching the final lesson! 🎉\n\nToday, we\'re exploring Generative AI—the kind that creates new content like text, images, and even music!',
        characterExpression: 'happy',
      },
      {
        id: 'scene-3-2',
        dialogueText: 'Generative AI learns patterns from millions of examples. Then it can generate brand new, original content that follows those patterns.\n\nThink of it like learning to write poetry by reading thousands of poems!',
        characterExpression: 'encouraging',
      },
      {
        id: 'scene-3-3',
        dialogueText: 'ChatGPT and similar tools use something called Large Language Models (LLMs). They\'ve learned from massive amounts of text and can now have conversations with you!',
        characterExpression: 'thinking',
      },
      {
        id: 'scene-3-4',
        dialogueText: 'But here\'s something important: Generative AI has limitations and can sometimes make mistakes. It\'s a powerful tool, but we should use it responsibly!',
        characterExpression: 'neutral',
        microActivityType: 'multiple-choice',
        microActivityContent: {
          question: 'What should we remember about Generative AI?',
          options: [
            'It\'s always 100% accurate',
            'It can be useful, but we should verify its outputs and use it responsibly',
            'It can read your mind',
            'It\'s only good for writing essays',
          ],
          correctIndex: 1,
        },
      },
      {
        id: 'scene-3-5',
        dialogueText: 'Exactly! 💡 Generative AI is a powerful tool for creativity and productivity, but responsible use is key. Always verify information, respect privacy, and use it ethically.',
        characterExpression: 'encouraging',
      },
      {
        id: 'scene-3-6',
        dialogueText: 'You\'ve completed the AI for ALL journey! 🏆\n\nYou earned 200 XP and unlocked the "Creator AI Expert" badge!\n\nYou\'re now ready to explore real-world AI applications. Check out the Rewards section to claim your achievements!',
        characterExpression: 'happy',
      },
    ],
    choices: {
      'scene-3-1': [
        {
          id: 'choice-3-1-1',
          text: 'Let\'s learn! 🚀',
          nextSceneId: 'scene-3-2',
        },
      ],
      'scene-3-2': [
        {
          id: 'choice-3-2-1',
          text: 'Tell me more',
          nextSceneId: 'scene-3-3',
        },
      ],
      'scene-3-3': [
        {
          id: 'choice-3-3-1',
          text: 'So how do I use it wisely?',
          nextSceneId: 'scene-3-4',
        },
      ],
      'scene-3-4': [
        {
          id: 'choice-3-4-1',
          text: 'Use it responsibly!',
          nextSceneId: 'scene-3-5',
          isCorrectPath: true,
        },
        {
          id: 'choice-3-4-2',
          text: 'It\'s always accurate',
          nextSceneId: 'scene-3-5',
          isCorrectPath: false,
          correctionText: 'Not quite! AI can make mistakes. Always verify important information and use AI ethically! 🔍',
        },
      ],
      'scene-3-5': [
        {
          id: 'choice-3-5-1',
          text: 'Finish! →',
          nextSceneId: 'scene-3-6',
        },
      ],
      'scene-3-6': [
        {
          id: 'choice-3-6-1',
          text: 'See Rewards →',
          nextModuleId: 'module-complete',
        },
      ],
    },
  },
];

export function getStoryModule(moduleId: string): StoryModule | undefined {
  return MOCK_STORY_MODULES.find((m) => m.id === moduleId);
}

export function getScene(moduleId: string, sceneId: string) {
  const module = getStoryModule(moduleId);
  if (!module) return undefined;
  return module.scenes.find((s) => s.id === sceneId);
}

export function getChoices(moduleId: string, sceneId: string) {
  const module = getStoryModule(moduleId);
  if (!module) return [];
  return module.choices[sceneId] || [];
}
