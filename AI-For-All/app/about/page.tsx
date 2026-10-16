/**
 * app/about/page.tsx
 *
 * About Us page for AI for ALL — Story-Based Learning (SBL).
 * Styled identically to app/terms/page.tsx (uses .terms-page* CSS classes).
 * Content sourced from md-files/ABOUT.md.
 *
 * Linked from:
 *  - app/get-started/page.tsx  (below "Accessibility and assistance")
 *  - app/account/profile/page.tsx  (Settings section)
 */
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function AboutPage() {
  return (
    <main className="terms-page">
      <div className="terms-page-header">
        <Link href="/get-started" aria-label="Back">
          <ChevronLeft size={20} />
        </Link>
        <h1>About AI for ALL</h1>
      </div>

      <div className="terms-page-body">
        <p className="terms-meta">
          AI for ALL — Story-Based Learning (SBL) System
          <br />
          A project under the SM AI for All Initiative
        </p>

        <p>
          For any mall-goer who meets AI only as a hidden feature of everyday products,
          AI for ALL is a story-driven learning experience that teaches basic AI concepts
          in minutes.
        </p>

        <h2>What We Do</h2>
        <p>
          AI for ALL is a web-based learning platform that introduces basic artificial
          intelligence concepts to non-technical users through short, interactive stories.
          A mascot guides you through a branching, choice-driven story that explains ideas
          such as Generative AI and Machine Learning using everyday scenarios. You also try
          a quick hands-on AI activity, so you learn by doing and not just by reading.
        </p>
        <ul>
          <li>
            <strong>No account needed.</strong> Continue as a guest and finish a story
            right away, or register to save your progress.
          </li>
          <li>
            <strong>No app to install.</strong> Use it on a tablet at an SM caravan
            activity, or open it in your mobile browser.
          </li>
          <li>
            <strong>Built for everyone.</strong> The experience is designed for teens,
            working adults, and senior citizens, with high contrast and an
            accessibility-conscious design.
          </li>
          <li>
            <strong>Keep learning.</strong> When you finish a story, you get a direct link
            to IBM SkillsBuild to continue your AI learning journey.
          </li>
        </ul>

        <h2>Our Developers</h2>
        <p>
          We are a four-person team of Computer Science students at Asia Pacific College,
          working together as a Scrum team.
        </p>

        <h3>Antonne Miguelle Catap — Project Manager</h3>
        <p>
          Leads the project and manages its requirements and product backlog. Antonne has
          experience leading end-to-end software projects, managing cloud infrastructure
          (Azure DevOps, Vercel), handling client and stakeholder communication, and
          building machine learning models in Python. He holds certifications in AWS,
          Oracle Cloud Infrastructure, and Alibaba Cloud.{' '}
          <a
            href="https://www.linkedin.com/in/antonnemiguelle-catap-4a5946288/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </p>

        <h3>Micharl Lance Angelo Tan Feliz — Scrum Master</h3>
        <p>
          Facilitates Scrum and removes obstacles for the team. Micharl develops
          full-stack web applications with Next.js, React, Supabase, and PostgreSQL, and
          has contributed to projects for DOST-STII and the SM AI for ALL Initiative. He
          is Alibaba Cloud ACA certified and has AWS Academy Cloud Architecting training.{' '}
          <a
            href="https://www.linkedin.com/in/kyle-saqueton-16810328a/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </p>

        <h3>Michael Orenze — Developer</h3>
        <p>
          Develops and tests features. Michael is skilled in front-end and back-end web
          development, prompt engineering with Claude Code, and DevOps cloud practices. He
          served as Lead Developer of the Dorotheo Dental Clinic website project.{' '}
          <a
            href="https://www.linkedin.com/in/michael-orenze-59753a289/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </p>

        <h3>Claude Jairo Famador — Developer</h3>
        <p>
          Develops and tests features. Claude Jairo has hands-on experience with
          AI-integrated educational systems and NLP applications, including AI-driven
          story and quest generation, admin analytics dashboards, and a dialect-aware
          smishing detection model.{' '}
          <a
            href="https://www.linkedin.com/in/claude-jairo-famador-343133289/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </p>

        <h3>Our Adviser</h3>
        <p>
          <strong>Roselle Wednesday Gardon</strong> guides the team throughout the
          project.
        </p>

        <h2>Asia Pacific College (APC)</h2>
        <p>
          AI for ALL is a capstone project developed by students of the{' '}
          <strong>School of Computing and Information Technologies (SoCIT)</strong> at{' '}
          <strong>Asia Pacific College</strong>, in Magallanes, Makati City. It was
          created for the Software Development subject, as part of the requirements for
          the Bachelor of Science in Computer Science, Software Systems specialization.
        </p>
        <p>
          APC is the project's academic sponsor and funding source, and its faculty and
          adviser support the team from design through build and deployment.
        </p>

        <h2>SM Supermalls (SM)</h2>
        <p>
          <strong>SM Supermalls</strong> is our primary client and the site host for AI
          for ALL. The platform is deployed during scheduled SM caravan activities, where
          mall-goers can walk up to a tablet and complete a short story-based lesson on
          their own, without staff assistance.
        </p>
        <p>
          The system is built to run on public mall Wi-Fi and mid-range mobile devices.
          It does not change any of SM&apos;s internal IT systems.
        </p>

        <h2>Our Partner</h2>
        <p>
          <strong>IBM SkillsBuild</strong> is our learning-continuation partner. After
          completing a story, users are offered a one-way direct link to the IBM
          SkillsBuild registration portal, where they can keep exploring AI at their own
          pace.
        </p>

        <p className="terms-meta" style={{ marginTop: 32 }}>
          © 2026 AI for ALL Story-Based Learning Team, Asia Pacific College.
          Developed in support of the SM AI for All Initiative.
        </p>
      </div>
    </main>
  )
}
