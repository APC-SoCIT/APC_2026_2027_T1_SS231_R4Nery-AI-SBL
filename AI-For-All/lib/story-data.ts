export type StoryChoice = { label: string; next: string; correct?: boolean }

export type StoryScene = {
  id: string
  eyebrow: string
  title: string
  body: string
  image: string
  choices?: StoryChoice[]
  activity?: string
}

export const storyScenes: Record<string, StoryScene> = {
  intro: { id: 'intro', eyebrow: 'A new beginning', title: 'Meet Maya', body: 'Maya has an idea for a helpful app. She is ready to learn how AI can bring it to life.', image: '/ai-for-all/story.png', choices: [{ label: 'Let’s help Maya', next: 'idea' }] },
  idea: { id: 'idea', eyebrow: 'Step 1 · The idea', title: 'What should Maya do first?', body: 'A clear question helps an AI assistant understand what you need. Which prompt would help Maya get started?', image: '/ai-for-all/mascot.png', choices: [{ label: '“Make it perfect.”', next: 'feedback', correct: false }, { label: '“Help me plan an app for sharing books.”', next: 'feedback', correct: true }] },
  feedback: { id: 'feedback', eyebrow: 'Step 2 · Try and learn', title: 'AI gets better with feedback', body: 'Maya reviews the first idea and asks for a change. Good collaboration means staying curious and specific.', image: '/ai-for-all/story.png', choices: [{ label: 'Ask for a clearer version', next: 'finish', correct: true }, { label: 'Give up after one try', next: 'finish', correct: false }] },
  finish: { id: 'finish', eyebrow: 'You did it', title: 'Maya has a next step', body: 'You helped Maya turn a big idea into an actionable plan. AI is a tool — your questions and choices guide the way.', image: '/ai-for-all/welcome.png', activity: 'Choose one way you will use AI thoughtfully this week.' },
}

export const archiveStories = [
  { title: 'The Helpful Robot', category: 'AI basics', level: 'Starter', progress: 100 },
  { title: 'Maya’s Big Idea', category: 'Creative thinking', level: 'Starter', progress: 65 },
  { title: 'A Fair Future', category: 'Responsible AI', level: 'Next up', progress: 0 },
]

export const adminStories = archiveStories.map((story, index) => ({ ...story, status: index === 2 ? 'Draft' : 'Published', updated: index === 0 ? 'Today' : 'Yesterday' }))
