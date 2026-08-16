export type StoryChoice = {
  id: string
  label: string
  weight: number // +1 for Choice A (Left choice / Intellect route), -1 for Choice B (Right choice / Creative route)
  next?: string
  correct?: boolean
}

export type StoryActivity = {
  intellectPrompt: string // Score >= 0
  otherRoutePrompt: string // Score < 0
}

export type StoryScene = {
  id: string
  eyebrow?: string
  title: string
  body: string
  image?: string
  choices?: StoryChoice[] // Max 2 choices!
}

export type StoryModule = {
  id: string
  title: string
  category: string
  level: string
  type: 'choices_only' | 'with_activity' // Option: Tap choices only OR With Activity
  description?: string
  color?: string
  image?: string
  status: 'Draft' | 'Published' | 'Archived'
  updatedAt?: string
  createdAt?: string
  skillsBuildUrl?: string
  skillsBuildButtonText?: string
  allowFreeText?: boolean
  storyFor?: 'all' | 'guests' | 'registered'
  scenes: StoryScene[]
  activity?: StoryActivity
}

export const defaultStories: StoryModule[] = [
  {
    id: 'story-study-buddy',
    title: 'Study Buddy',
    category: 'AI Basics',
    level: 'Starter',
    type: 'choices_only',
    description: 'Build a helpful study companion with interactive choices.',
    color: '#79a8ff',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design%20%2889%29%201-VY50vMtptXr0tOsB2AUUCKt4I96OmQ.png',
    status: 'Published',
    updatedAt: 'Today',
    createdAt: new Date().toISOString(),
    skillsBuildUrl: 'https://skillsbuild.org',
    skillsBuildButtonText: 'Take Course on IBM SkillsBuild',
    scenes: [
      {
        id: 'scene-1',
        eyebrow: 'SCENE 1 · THE DISCOVERY',
        title: 'Meet Your AI Guide',
        body: 'You want to build a study companion to help organize your notes. What is the first step in setting up an effective AI assistant?',
        image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design%20%2889%29%201-VY50vMtptXr0tOsB2AUUCKt4I96OmQ.png',
        choices: [
          { id: 'c1-a', label: 'Define clear instructions and goals (+1 Intellect)', weight: 1 },
          { id: 'c1-b', label: 'Let it guess what you need (-1 Creative)', weight: -1 }
        ]
      },
      {
        id: 'scene-2',
        eyebrow: 'SCENE 2 · THE QUESTION',
        title: 'Structuring Prompts',
        body: 'Your AI assistant gives a vague answer. How do you refine your request to get better results?',
        choices: [
          { id: 'c2-a', label: 'Provide specific context and examples (+1 Intellect)', weight: 1 },
          { id: 'c2-b', label: 'Repeat the exact same prompt (-1 Creative)', weight: -1 }
        ]
      },
      {
        id: 'scene-3',
        eyebrow: 'SCENE 3 · THE RESULT',
        title: 'Evaluating Output',
        body: 'The AI companion finishes summarizing your lesson. What should you do before using the summary?',
        choices: [
          { id: 'c3-a', label: 'Verify facts and check references (+1 Intellect)', weight: 1 },
          { id: 'c3-b', label: 'Copy it without double-checking (-1 Creative)', weight: -1 }
        ]
      }
    ]
  },
  {
    id: 'story-train-your-bot',
    title: 'Train Your Bot',
    category: 'Creative thinking',
    level: 'Starter',
    type: 'with_activity',
    description: 'Learn how prompts guide AI with an interactive text activity at the end.',
    color: '#ff694d',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design%20%2886%29%201-rBSaIUsON4qoxIWreizUBniwa2lTVe.png',
    status: 'Published',
    updatedAt: 'Yesterday',
    createdAt: new Date().toISOString(),
    skillsBuildUrl: 'https://skillsbuild.org',
    skillsBuildButtonText: 'Explore IBM Prompt Course',
    scenes: [
      {
        id: 'scene-1',
        eyebrow: 'SCENE 1 · THE IDEA',
        title: 'Maya’s Bot Vision',
        body: 'Maya is building a chatbot to recommend books at SM Booknook. Which approach should she use to train her bot?',
        image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design%20%2886%29%201-rBSaIUsON4qoxIWreizUBniwa2lTVe.png',
        choices: [
          { id: 'c1-a', label: 'Feed it structured genre categories & ratings (+1 Intellect)', weight: 1 },
          { id: 'c1-b', label: 'Use random book quotes & intuitive hints (-1 Creative)', weight: -1 }
        ]
      },
      {
        id: 'scene-2',
        eyebrow: 'SCENE 2 · FEEDBACK LOOP',
        title: 'Adjusting Bot Behavior',
        body: 'A customer asks for a mystery novel recommendation. How should the bot respond?',
        choices: [
          { id: 'c2-a', label: 'Analyze past reading data and suggest top matches (+1 Intellect)', weight: 1 },
          { id: 'c2-b', label: 'Suggest a wildly surprising unread story (-1 Creative)', weight: -1 }
        ]
      }
    ],
    activity: {
      intellectPrompt: 'Intellect Route Activity: In your own words, explain how structured data and clear criteria help machine learning models make accurate predictions.',
      otherRoutePrompt: 'Creative Route Activity: Write a short creative prompt describing how an imaginative AI chatbot can surprise readers with unexpected book suggestions.'
    }
  },
  {
    id: 'story-trust-the-system',
    title: 'Trust the System?',
    category: 'Responsible AI',
    level: 'Intermediate',
    type: 'with_activity',
    description: 'Explore responsible AI choices and complete the reflection activity.',
    color: '#7fd3af',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design%20%2887%29%201-WlTU4dT7vim0CGF0VihadqQ7EvoMrF.png',
    status: 'Published',
    updatedAt: '2 days ago',
    createdAt: new Date().toISOString(),
    skillsBuildUrl: 'https://skillsbuild.org',
    skillsBuildButtonText: 'Learn AI Ethics',
    scenes: [
      {
        id: 'scene-1',
        eyebrow: 'SCENE 1 · BIAS DISCOVERY',
        title: 'Noticing Patterns',
        body: 'You notice an automated grading tool treats certain essay styles differently. What is your immediate reaction?',
        image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design%20%2887%29%201-WlTU4dT7vim0CGF0VihadqQ7EvoMrF.png',
        choices: [
          { id: 'c1-a', label: 'Audit the dataset for representation bias (+1 Intellect)', weight: 1 },
          { id: 'c1-b', label: 'Experiment with creative phrasing to test limits (-1 Creative)', weight: -1 }
        ]
      },
      {
        id: 'scene-2',
        eyebrow: 'SCENE 2 · ETHICAL CHOICE',
        title: 'Human in the Loop',
        body: 'Should critical AI decisions always have human oversight before implementation?',
        choices: [
          { id: 'c2-a', label: 'Yes, enforce mandatory human review (+1 Intellect)', weight: 1 },
          { id: 'c2-b', label: 'No, let the AI act autonomously for speed (-1 Creative)', weight: -1 }
        ]
      }
    ],
    activity: {
      intellectPrompt: 'Intellect Route Activity: Describe two specific steps developers can take to ensure AI systems are fair, transparent, and unbiased.',
      otherRoutePrompt: 'Creative Route Activity: Write a short story snippet where a human and an AI collaborate to solve an ethical dilemma.'
    }
  }
]

// Legacy export compatibility
export const storyScenes: Record<string, any> = {
  intro: { id: 'intro', eyebrow: 'A new beginning', title: 'Meet Maya', body: 'Maya has an idea for a helpful app. She is ready to learn how AI can bring it to life.', image: '/ai-for-all/story.png', choices: [{ label: 'Let’s help Maya', next: 'idea' }] },
}

export const archiveStories = defaultStories
export const adminStories = defaultStories
