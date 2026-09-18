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
    category: 'Smart Helpers',
    level: 'Starter',
    type: 'choices_only',
    description: 'Meet a friendly smart helper that makes studying easier and more fun.',
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
        title: 'Meet Your Smart Helper',
        body: 'You want to build a smart study helper that keeps your notes organized and quizzes you before exams. What is the first thing you should do?',
        image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design%20%2889%29%201-VY50vMtptXr0tOsB2AUUCKt4I96OmQ.png',
        choices: [
          { id: 'c1-a', label: 'Tell the helper exactly what subject you need help with', weight: 1 },
          { id: 'c1-b', label: 'Let the helper figure it out on its own', weight: -1 }
        ]
      },
      {
        id: 'scene-2',
        eyebrow: 'SCENE 2 · THE QUESTION',
        title: 'Asking the Right Way',
        body: 'Your smart helper gave you a confusing answer. How do you ask again so it understands you better?',
        choices: [
          { id: 'c2-a', label: 'Give more details and an example of what you mean', weight: 1 },
          { id: 'c2-b', label: 'Ask the exact same question again and hope for the best', weight: -1 }
        ]
      },
      {
        id: 'scene-3',
        eyebrow: 'SCENE 3 · THE RESULT',
        title: 'Checking the Answer',
        body: 'The helper finished writing a summary of your lesson. It looks good! What should you do before using it?',
        choices: [
          { id: 'c3-a', label: 'Read through it carefully and double-check the facts', weight: 1 },
          { id: 'c3-b', label: 'Copy it right away without reading', weight: -1 }
        ]
      }
    ]
  },
  {
    id: 'story-train-your-bot',
    title: 'Train Your Bot',
    category: 'Creative Thinking',
    level: 'Starter',
    type: 'with_activity',
    description: 'Help Maya teach a smart book helper to recommend the perfect stories to readers.',
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
        title: 'Maya\'s Book Helper',
        body: 'Maya works at a bookstore and wants to build a smart helper that suggests the perfect book for each customer. How should she teach the helper what books to recommend?',
        image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design%20%2886%29%201-rBSaIUsON4qoxIWreizUBniwa2lTVe.png',
        choices: [
          { id: 'c1-a', label: 'Sort books into groups like mystery, comedy, and adventure, then share reader ratings', weight: 1 },
          { id: 'c1-b', label: 'Pick random exciting quotes from books and let the helper guess', weight: -1 }
        ]
      },
      {
        id: 'scene-2',
        eyebrow: 'SCENE 2 · HELPING A READER',
        title: 'Finding the Right Book',
        body: 'A customer walks in and says, "I love mystery stories!" How should the helper pick a book for them?',
        choices: [
          { id: 'c2-a', label: 'Look at what mystery books other readers loved and suggest the best ones', weight: 1 },
          { id: 'c2-b', label: 'Surprise them with a random book they have never heard of', weight: -1 }
        ]
      }
    ],
    activity: {
      intellectPrompt: 'In your own words, explain how organizing books into groups and remembering what readers liked helps a smart helper give better suggestions.',
      otherRoutePrompt: 'Imagine a smart book helper that surprises readers in a fun way. Write a short description of how it would pick books nobody expected!'
    }
  },
  {
    id: 'story-trust-the-system',
    title: 'Trust the System?',
    category: 'Fairness in Technology',
    level: 'Intermediate',
    type: 'with_activity',
    description: 'Learn when to trust a smart tool and when to ask more questions.',
    color: '#7fd3af',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design%20%2887%29%201-WlTU4dT7vim0CGF0VihadqQ7EvoMrF.png',
    status: 'Published',
    updatedAt: '2 days ago',
    createdAt: new Date().toISOString(),
    skillsBuildUrl: 'https://skillsbuild.org',
    skillsBuildButtonText: 'Learn About Fairness in Tech',
    scenes: [
      {
        id: 'scene-1',
        eyebrow: 'SCENE 1 · SOMETHING SEEMS OFF',
        title: 'Noticing Something Unfair',
        body: 'You notice that a smart grading tool gives lower scores to essays written in a casual, friendly style — even when the ideas are great. What do you do first?',
        image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design%20%2887%29%201-WlTU4dT7vim0CGF0VihadqQ7EvoMrF.png',
        choices: [
          { id: 'c1-a', label: 'Check if the tool is being fair to all kinds of writing styles', weight: 1 },
          { id: 'c1-b', label: 'Try writing in different styles to see what happens', weight: -1 }
        ]
      },
      {
        id: 'scene-2',
        eyebrow: 'SCENE 2 · WHO DECIDES?',
        title: 'Should a Person Double-Check?',
        body: 'The smart tool is about to make an important decision that affects people. Should a real person always look at the result before it goes out?',
        choices: [
          { id: 'c2-a', label: 'Yes — a person should always check important decisions', weight: 1 },
          { id: 'c2-b', label: 'No — let the tool decide on its own so it is faster', weight: -1 }
        ]
      }
    ],
    activity: {
      intellectPrompt: 'Think of two things people can do to make sure smart tools treat everyone fairly. Write them down in your own words.',
      otherRoutePrompt: 'Imagine a story where a person and a smart tool work together to fix something unfair. What happens? Write a few sentences about it.'
    }
  }
]

// Legacy export compatibility
export const storyScenes: Record<string, any> = {
  intro: { id: 'intro', eyebrow: 'A new beginning', title: 'Meet Maya', body: 'Maya has an idea for a helpful app. She is ready to learn how AI can bring it to life.', image: '/ai-for-all/story.png', choices: [{ label: 'Let’s help Maya', next: 'idea' }] },
}

export const archiveStories = defaultStories
export const adminStories = defaultStories
