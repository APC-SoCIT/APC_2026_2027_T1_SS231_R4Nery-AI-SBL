export type StoryMeta = {
  id: string
  title: string
  color: string
  bullets: string[]
  cardMascot: string
}

export const storyList: StoryMeta[] = [
  {
    id: 'study-buddy',
    title: 'Study Buddy',
    color: '#6f8ce8',
    bullets: ['Build a smarter study plan', 'Learn how prompts affect answers', 'Discover rule-based chatbots'],
    cardMascot: '/ai-for-all/Story-Page-Mascot-1.png',
  },
  {
    id: 'train-your-bot',
    title: 'Train Your Bot',
    color: '#ff7a45',
    bullets: ['Train your robot with examples', 'Test how it recognizes patterns', 'Correct mistakes with feedback'],
    cardMascot: '/ai-for-all/Story-Page-Mascot-2.png',
  },
  {
    id: 'trust-the-system',
    title: 'Trust the System?',
    color: '#66cf9e',
    bullets: ['Explore AI recommendations', 'Spot bias and poor suggestions', 'Decide when to trust or override AI'],
    cardMascot: '/ai-for-all/Story-Page-Mascot-3.png',
  },
]

export function getStory(id: string) {
  return storyList.find((s) => s.id === id)
}

// NOTE: only Study Buddy's dialogue was shown in the reference screenshot.
// Train Your Bot / Trust the System dialogue below is approximated to match
// tone and structure — send the real scripts to replace this.
export type StoryScript = {
  scene1: { message: string; choices: [string, string] }
  scene2: { message: string; choices: [string, string] }
  activityPlaceholder: string
  response: string[]
}

export const storyScripts: Record<string, StoryScript> = {
  'study-buddy': {
    scene1: {
      message: "Hi, I'm your Study Buddy AI! I can help you review anything — what should we start with?",
      choices: ['Quiz me on a topic', 'Help me make a study plan'],
    },
    scene2: {
      message: 'Good choice! The way you ask matters — clear questions get clearer answers.',
      choices: ['Ask a broad question', 'Ask a specific question'],
    },
    activityPlaceholder: 'Try writing a study question...',
    response: [
      'AI is like a little mind that watches, learns, and gets better each time you show it something new.',
      'See how a specific prompt got a more useful answer? That\u2019s the power of clear prompting.',
    ],
  },
  'train-your-bot': {
    scene1: {
      message: "Let's train an AI assistant together. What should it learn first?",
      choices: ['Recognize patterns', 'Follow examples'],
    },
    scene2: {
      message: 'Great! AI gets better with feedback, not just examples.',
      choices: ['Give positive feedback', 'Correct a mistake'],
    },
    activityPlaceholder: 'Try giving your bot an instruction...',
    response: [
      'AI is like a little mind that watches, learns, and gets better each time you show it something new.',
      'Your bot adjusted its answer based on what you told it \u2014 that\u2019s how training works.',
    ],
  },
  'trust-the-system': {
    scene1: {
      message: 'An AI just gave you a recommendation. What do you do first?',
      choices: ['Accept it right away', 'Check where it came from'],
    },
    scene2: {
      message: 'Even helpful AI can be biased. Staying curious matters.',
      choices: ['Trust it completely', 'Ask a follow-up question'],
    },
    activityPlaceholder: 'Try asking the AI to explain itself...',
    response: [
      'AI is like a little mind that watches, learns, and gets better each time you show it something new.',
      'Questioning AI responses helps you use them responsibly.',
    ],
  },
}