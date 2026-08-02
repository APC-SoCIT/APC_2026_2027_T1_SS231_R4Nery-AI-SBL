# AI for ALL - Interactive AI Literacy Platform

A story-based AI learning platform designed for touchscreen kiosks and mobile browsers. Learn AI concepts through branching narratives, interactive choices, and engaging challenges.

## Overview

**AI for ALL** teaches artificial intelligence through interactive storytelling. Users can play as a guest to try one story risk-free, then create an account to save progress, access all content, and unlock rewards. Perfect for students, educators, and anyone curious about AI.

### Key Features

- **Flexible Authentication**:
  - Play as Guest: Try one complete story without an account
  - Create Account: Email/password or Google sign-up
  - Save Progress: All logged-in users' progress persists across sessions
  - Post-Story Prompt: Guests are prompted to create an account after completing their first story
- **Interactive Story Modules**: 3 core lessons covering:
  - Welcome to AI (Introduction)
  - Machine Learning Magic (How ML Works)
  - Generative AI Unlocked (Generative AI & LLMs)
- **Branching Narratives**: Your choices matter—select different paths through each lesson
- **Persona System**: Choose from 4 unique AI guide avatars
- **Progress Tracking**: Real-time XP counter, module completion tracking
- **Reward Redemption**: Claim rewards with mock QR code confirmations
- **Admin Dashboard**: Analytics, content management, and performance metrics
- **Mobile-First Design**: Touch-friendly (44px tap targets), responsive for kiosk and mobile

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS + CSS Modules + CSS custom properties
- **State Management**: React Context API
- **Data**: Mock JSON (structured for Supabase integration later)
- **Deployment**: Ready for Vercel

## Authentication Flow

### Play as Guest
1. User lands on `/`
2. Clicks "Get Started" → redirects to `/auth`
3. Selects "Play as Guest" → skips to `/persona-selection`
4. Plays through first story module
5. On `/progress` after first module: Signup prompt appears
6. Can continue as guest or create account

### Sign Up / Log In
1. From `/auth`: Select "Log In / Sign Up"
2. Options:
   - **Email/Password**: Fill form with name (for signup), email, password
   - **Google**: Click "Sign Up with Google" or "Log In with Google"
3. Redirects to `/persona-selection` and begins learning journey
4. All progress saved to session automatically

### Auth Context (sessionContext.tsx)
```typescript
{
  isLoggedIn: boolean,    // User has an account
  isGuest: boolean,       // Playing without an account
  user?: {
    email: string,
    name: string
  }
}
```

## Project Structure

```
app/
  /                     # Landing page
  /auth                 # Authentication (Play as Guest / Log In / Sign Up)
  /persona-selection    # Avatar picker
  /story/[moduleId]     # Interactive story module (core loop)
  /progress             # Module completion dashboard + signup prompt for guests
  /rewards              # Reward redemption
  /admin
    /login              # Admin login (stub)
    /dashboard          # Analytics & content management

components/
  /Header.tsx           # Navigation header
  /MascotDialogue.tsx   # Character + dialogue bubble
  /ChoiceButton.tsx     # Interactive choice buttons
  /ProgressBar.tsx      # Step progress indicator
  /SignupPrompt.tsx     # Modal that appears after guest's first story

lib/
  /types.ts             # TypeScript interfaces
  /storyData.ts         # Mock story modules & branching logic
  /rewardsData.ts       # Mock rewards catalog
  /sessionContext.tsx   # React Context for session, auth, progress state

app/globals.css         # Theme: colors, typography, spacing, animations
```

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open browser to http://localhost:3000
```

### Build for Production

```bash
pnpm run build
pnpm start
```

## Usage

### User Journey

#### Guest Path
1. **Landing** (`/`): User lands on welcome screen
2. **Auth** (`/auth`): Click "Get Started" → Select "Play as Guest"
3. **Persona Selection** (`/persona-selection`): Choose from 4 avatars
4. **Story Module** (`/story/module-1`): Complete first story
5. **Progress + Signup Prompt** (`/progress`): See XP earned, then prompted to create account
6. **Options**: 
   - Create account via email or Google → continue to module 2
   - Continue as guest → can play more stories or create account later

#### Logged-In Path
1. **Landing** (`/`): Click "Get Started"
2. **Auth** (`/auth`): Select "Log In / Sign Up"
3. **Login/Signup Form** (`/auth`): Enter credentials or use Google
4. **Persona Selection** (`/persona-selection`): Choose guide avatar
5. **Story Modules** (`/story/[moduleId]`): Play through lessons in sequence
6. **Progress Dashboard** (`/progress`): Track journey and unlock badges
7. **Rewards** (`/rewards`): Claim rewards with accumulated XP
8. **Admin** (`/admin/dashboard`): Admins can view analytics and manage content

#### Key Differences
- **Guests**: Play 1 story, then prompted to create account; progress not saved after logout
- **Logged-In**: Unlimited story access, progress persists, can claim rewards

### Story Module Flow

- Each module contains 5-6 scenes
- Scenes include mascot dialogue, character expressions, and micro-activities
- Users select from 2-3 branching choices per scene
- Choices may lead to different scenes or include corrective feedback
- Completing a module awards XP and unlocks a badge

### Making Choices Matter

Choices in `/lib/storyData.ts` have:
- `nextSceneId`: Where this choice leads (same module)
- `nextModuleId`: If this completes the module, which module is next
- `isCorrectPath`: Whether this was the "right" answer
- `correctionText`: Gentle feedback if wrong

Example:
```typescript
{
  id: 'choice-1-3-2',
  text: 'Controlling weather',
  nextSceneId: 'scene-1-4',
  isCorrectPath: false,
  correctionText: 'Not quite! Weather control is sci-fi. But AI helps forecast weather! 🌦️',
}
```

## Customization

### Change Colors & Theme

Edit CSS custom properties in `app/globals.css`:

```css
:root {
  --color-primary: #6C63FF;        /* Brand purple */
  --color-secondary: #FF6B6B;      /* Accent red */
  /* ... more colors and typography */
}
```

### Add New Story Modules

1. Create module object in `lib/storyData.ts`:
   ```typescript
   {
     id: 'module-4',
     title: 'Your Module Title',
     topic: 'Your Topic',
     scenes: [ /* scenes array */ ],
     choices: { /* sceneId -> choices map */ },
     pointsReward: 250,
     unlockedBadge: { id: 'badge-4', name: 'Badge Name', icon: '🏆' }
   }
   ```
2. Add module to `MOCK_STORY_MODULES` array
3. Update routing in `/story/[moduleId]/page.tsx` if needed

### Add New Rewards

1. Edit `lib/rewardsData.ts`:
   ```typescript
   {
     id: 'reward-7',
     name: 'Your Reward',
     description: 'Description',
     pointsCost: 300,
     icon: '🎁',
     externalUrl: 'https://...'
   }
   ```
2. Add to `MOCK_REWARDS` array

## Accessibility & Mobile

- **Touch-First**: All buttons ≥ 44px tap targets
- **Text**: Minimum 16px, supports browser scaling
- **Contrast**: WCAG AA compliant (at least 4.5:1 for text)
- **Semantic HTML**: Proper headings, ARIA labels, alt text
- **Responsive**: Works on 5" mobile to large kiosk screens (1920px+)
- **No Hover-Only States**: All interactivity available via touch/focus

## Deployment

### Deploy to Vercel

```bash
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/yourname/ai-for-all.git
git push -u origin main

# Then connect repo to Vercel and deploy
```

Or use Vercel CLI:
```bash
npm install -g vercel
vercel
```

## Future Enhancements

- **Real Supabase Integration**: Replace mock data with live database queries
- **User Accounts**: Email/password or social authentication
- **Real QR Codes**: Generate actual QR codes for reward redemption
- **AI Powered Feedback**: Use OpenAI/Anthropic to generate personalized feedback
- **Multi-Language Support**: Internationalize content
- **More Modules**: Expand curriculum with advanced AI topics
- **Leaderboards**: Competitive XP tracking
- **Mobile App**: React Native version for app stores

## Testing

### Manual Testing Checklist

- [ ] Landing page displays correctly
- [ ] Persona selection allows choosing an avatar
- [ ] Story module progresses through scenes on choice click
- [ ] Progress bar updates and reflects current position
- [ ] Dialogue text and mascot emoji display correctly
- [ ] Admin login accepts any username/password
- [ ] Admin dashboard shows analytics and modules table
- [ ] Responsive design works on mobile (375px) and desktop (1920px)
- [ ] Navigation (Home button) works from all pages
- [ ] Rewards page displays available rewards for current XP

### Running Tests

```bash
pnpm test  # (when tests are added)
```

## Support & Issues

For issues, feature requests, or questions:
1. Check existing issues on GitHub
2. Create a new issue with clear description and reproduction steps
3. Contact the development team

## License

MIT License - See LICENSE file for details

## Credits

Built with Next.js, React, TypeScript, and vanilla CSS. Designed for SM Malls' AI literacy initiative and IBM SkillsBuild integration.

---

**Ready to explore AI?** Visit http://localhost:3000 and start your journey! 🚀
