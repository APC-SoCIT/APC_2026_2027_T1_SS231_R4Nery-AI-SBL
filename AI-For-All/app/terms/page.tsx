/**
 * app/terms/page.tsx
 *
 * Full Terms and Conditions text, linked from the consent checkbox on
 * /sign-up. Source: "UPDATED AI for ALL Terms and Conditions.docx" (v2.0).
 *
 * TODO before launch:
 *   - Fill in the effective date below (EFFECTIVE_DATE).
 *   - Fill in the real contact emails in Section 12 (CONTACT_EMAIL /
 *     DPO_CONTACT).
 */
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

const EFFECTIVE_DATE = '[DD Month YYYY]' // TODO: set the real effective date
const CONTACT_EMAIL = '[team/contact email]' // TODO
const DPO_CONTACT = '[designated contact person and email]' // TODO

export default function TermsPage() {
  return (
    <main className="terms-page">
      <div className="terms-page-header">
        <Link href="/sign-up" aria-label="Back to sign up">
          <ChevronLeft size={20} />
        </Link>
        <h1>Terms and Conditions</h1>
      </div>

      <div className="terms-page-body">
        <p className="terms-meta">
          AI for ALL — Story-Based Learning (SBL) System
          <br />
          Effective Date: {EFFECTIVE_DATE} &nbsp;|&nbsp; Version 2.0
        </p>

        <p>
          Please read these Terms and Conditions ("Terms") carefully before creating an
          account or using the AI for ALL Story-Based Learning System ("SBL System," "the
          System," "we," or "us"). By selecting "I Agree," creating an account, or
          otherwise accessing or using the System, you ("User" or "you") acknowledge that
          you have read, understood, and agree to be bound by these Terms and our Privacy
          Notice. If you do not agree to these Terms, please refrain from creating an
          account or using the System.
        </p>

        <p className="terms-ai-note">
          These Terms were generated with the assistance of AI (Claude by Anthropic),
          guided and reviewed by the AI for ALL project team, and grounded in applicable
          Philippine law and industry-standard practices.
        </p>

        <h2>1. About the System</h2>
        <p>
          The AI for ALL – Story-Based Learning (SBL) System is an interactive,
          story-based learning experience operated under the SM AI for All Initiative. It
          is deployed via the SM Advantage caravan and is accessible on caravan-provided
          tablets and on users&rsquo; personal mobile devices through a web browser.
        </p>
        <p>
          The System is designed to introduce Artificial Intelligence (AI) literacy
          concepts to mall goers — including teenagers, working adults, and senior
          citizens — through short branching-narrative modules, in partnership with IBM
          SkillsBuild. The System is developed as a capstone project by students of Asia
          Pacific College (APC), School of Computing and Information Technologies
          (SoCIT).
        </p>

        <h2>2. Eligibility</h2>
        <p>To create an account and use the System, users must meet the following conditions:</p>
        <ul>
          <li>Users must be able to provide a valid Philippine mobile number or a Google account.</li>
          <li>Users below 18 years old may use the System but are encouraged to seek guardian assistance when providing personal information and when agreeing to these Terms.</li>
          <li>Users are responsible for ensuring that the information provided during account creation is accurate, current, and complete.</li>
          <li>By using the System, users represent that they have the legal capacity to enter into a binding agreement under Philippine law, or that a parent or guardian has consented on their behalf.</li>
        </ul>

        <h2>3. Account Creation and Authentication</h2>
        <p>Account creation and sign-in are handled through Supabase Authentication using one of the following methods:</p>
        <ul>
          <li>Philippine mobile number with a one-time password (OTP) sent via SMS; or</li>
          <li>Google (Gmail) sign-in via OAuth 2.0.</li>
        </ul>
        <p>
          Users are responsible for keeping their OTP, device, and linked account
          credentials secure. OTPs must not be shared with anyone. Users agree to notify
          the project team promptly if unauthorized access to their account is suspected.
        </p>
        <p>
          The project team reserves the right to suspend or terminate accounts that are
          found to violate these Terms, contain false information, or are used for
          unauthorized purposes.
        </p>

        <h2>4. Data Privacy</h2>
        <p>
          The AI for ALL – Story-Based Learning System, operated under the SM AI for All
          Initiative, collects and maintains personal data in accordance with Republic
          Act No. 10173, or the Data Privacy Act (DPA) of 2012, and its Implementing
          Rules and Regulations. For further details, please refer to SM&rsquo;s Privacy
          Policy at{' '}
          <a href="https://www.smsupermalls.com/privacy-policy/" target="_blank" rel="noreferrer">
            smsupermalls.com/privacy-policy
          </a>.
        </p>

        <h3>4.1 Data Collected</h3>
        <p>Upon account creation, the SBL System collects and processes the following personal data:</p>
        <ul>
          <li>Contact information: mobile number and/or Google account email, used for authentication and OTP delivery.</li>
          <li>Profile information: name and persona group (teen, working adult, senior citizen), used to personalize story content.</li>
          <li>Usage data: story modules started/completed, session duration, and quiz or activity responses, used to measure learning outcomes and improve the System.</li>
          <li>Device and technical data: device type, browser, and operating system, used for compatibility and performance monitoring.</li>
          <li>Session data: cookies and session tokens used to maintain login state and user preferences during a session.</li>
        </ul>
        <p>Only data necessary for the purposes stated above is collected. Personal data is not sold to any third party.</p>

        <h3>4.2 Cookies and Session Tracking</h3>
        <p>
          The System uses session cookies and local browser storage to maintain
          authentication state and user preferences during a session. These are strictly
          functional and are not used for advertising or cross-site tracking. By using
          the System, users consent to the use of these session-based technologies.
        </p>
        <p>
          Users may clear cookies and browser storage at any time through their browser
          settings, though doing so may require them to log in again.
        </p>

        <h3>4.3 Data Subject Rights</h3>
        <p>Under the Data Privacy Act of 2012, users have the right to:</p>
        <ul>
          <li>Be informed that personal data is being processed;</li>
          <li>Access, correct, or update personal data;</li>
          <li>Object to or withdraw consent for processing, subject to legal or contractual restrictions;</li>
          <li>Request deletion of personal data, where applicable; and</li>
          <li>
            Lodge a complaint with the National Privacy Commission (NPC) at{' '}
            <a href="https://www.privacy.gov.ph" target="_blank" rel="noreferrer">privacy.gov.ph</a>.
          </li>
        </ul>
        <p>To exercise any of these rights, users may contact the project team using the details in Section 12 below.</p>

        <h3>4.4 Data Retention</h3>
        <p>
          Account and usage data is retained only for as long as necessary to fulfill the
          purposes described in Section 4.1, to comply with academic and institutional
          reporting requirements, or as required by law. Upon the conclusion of the
          project or upon a verified deletion request, personal data will be securely
          deleted or anonymized.
        </p>

        <h2>5. Intellectual Property</h2>
        <p>
          All content available through the SBL System — including but not limited to
          story modules, narrative content, learning materials, illustrations, quiz
          questions, and the system interface — is the intellectual property of the SM AI
          for All Initiative and the AI for ALL project team, unless otherwise stated.
        </p>
        <p>Users are granted a limited, non-exclusive, non-transferable license to access and use the System&rsquo;s content solely for personal, non-commercial learning purposes. Users must not:</p>
        <ul>
          <li>Copy, reproduce, distribute, or publicly display any content from the System without written permission;</li>
          <li>Modify, adapt, or create derivative works based on the System&rsquo;s content;</li>
          <li>Use the content for commercial purposes or for any purpose other than personal AI literacy learning; or</li>
          <li>Remove or alter any copyright, trademark, or other proprietary notices from the content.</li>
        </ul>
        <p>
          IBM SkillsBuild content accessed through the System is subject to IBM&rsquo;s
          own intellectual property terms.
        </p>

        <h2>6. Third-Party Services</h2>
        <p>The SBL System integrates with the following third-party platforms. By using the System, users acknowledge that these platforms have their own terms and privacy policies, which apply independently:</p>
        <ul>
          <li>
            IBM SkillsBuild: completing certain modules may redirect users to IBM
            SkillsBuild&rsquo;s platform. IBM&rsquo;s Terms of Use and Privacy Policy
            apply once the user is redirected. See{' '}
            <a href="https://skillsbuild.org/terms" target="_blank" rel="noreferrer">skillsbuild.org/terms</a>.
          </li>
          <li>
            Supabase: used as the backend and authentication provider for the System.
            Supabase processes authentication data and user records. See{' '}
            <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">supabase.com/privacy</a>.
          </li>
          <li>
            Vercel: used as the hosting and deployment platform for the System. See{' '}
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">vercel.com/legal/privacy-policy</a>.
          </li>
          <li>
            Google OAuth: used for Google sign-in. Google&rsquo;s Privacy Policy and Terms
            of Service apply when this sign-in method is used. See{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">policies.google.com/privacy</a>.
          </li>
        </ul>
        <p>The SBL System is not responsible for the content, availability, policies, or practices of these third-party platforms.</p>

        <h2>7. Acceptable Use</h2>
        <p>When accessing or using the System, users agree that they will not:</p>
        <ul>
          <li>Provide false, misleading, or another person&rsquo;s information to create an account;</li>
          <li>Attempt to interfere with, disrupt, or gain unauthorized access to the System, caravan devices, servers, or other users&rsquo; accounts;</li>
          <li>Upload, transmit, or introduce any malicious code, virus, or harmful content into the System;</li>
          <li>Use the System for any unlawful purpose or in a way that violates the rights of any person or entity;</li>
          <li>Attempt to reverse-engineer, decompile, disassemble, or extract source code from the System;</li>
          <li>Use automated tools, bots, or scrapers to access or collect data from the System; or</li>
          <li>Impersonate any person, organization, or entity in connection with the use of the System.</li>
        </ul>
        <p>Violation of these acceptable use provisions may result in immediate account suspension or termination, without prior notice.</p>

        <h2>8. Account Termination</h2>
        <p>
          Users may request the deletion of their account at any time by contacting the
          project team using the details in Section 12. Upon account deletion, personal
          data will be handled in accordance with Section 4.4 (Data Retention).
        </p>
        <p>The project team reserves the right to suspend or permanently terminate a user&rsquo;s account, without prior notice, if:</p>
        <ul>
          <li>The user violates any provision of these Terms;</li>
          <li>The account is found to contain false or fraudulent information; or</li>
          <li>Continued use of the account poses a security or legal risk to the System or other users.</li>
        </ul>
        <p>Following termination, the user&rsquo;s license to access the System ceases immediately.</p>

        <h2>9. Limitation of Liability</h2>
        <p>
          The SBL System is provided on an &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo; basis. While the project team makes reasonable efforts to
          maintain system availability and accuracy of content, no warranty — express or
          implied — is made regarding the System&rsquo;s completeness, reliability, or
          fitness for a particular purpose.
        </p>
        <p>To the extent permitted by Philippine law, the SM AI for All project team and Asia Pacific College shall not be liable for:</p>
        <ul>
          <li>Any indirect, incidental, special, or consequential damages arising from the use of or inability to use the System;</li>
          <li>Loss of data, unauthorized access to accounts, or service interruptions; or</li>
          <li>Any content or actions of third-party platforms linked through the System.</li>
        </ul>

        <h2>10. Governing Law and Jurisdiction</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of
          the Republic of the Philippines, including but not limited to Republic Act No.
          10173 (Data Privacy Act of 2012) and Republic Act No. 8792 (Electronic Commerce
          Act of 2000).
        </p>
        <p>
          Any disputes arising from or related to these Terms or the use of the System
          shall be subject to the exclusive jurisdiction of the proper courts of the
          Philippines.
        </p>

        <h2>11. Changes to These Terms</h2>
        <p>
          These Terms may be updated from time to time to reflect changes in the System,
          data practices, applicable law, or feedback from regulatory bodies. Where
          changes are material, reasonable steps will be taken to notify users — such as
          a notice on the System&rsquo;s website or a prompt upon next login — before the
          changes take effect.
        </p>
        <p>
          Continued use of the System after updated Terms take effect constitutes
          acceptance of the revised Terms. Users who do not agree to the revised Terms
          should discontinue use of the System and may request account deletion per
          Section 8.
        </p>

        <h2>12. Contact Us</h2>
        <p>For questions about these Terms, to exercise data privacy rights, or to request account deletion, users may contact the AI for ALL project team at:</p>
        <ul>
          <li>Email: {CONTACT_EMAIL}</li>
          <li>Data Privacy Point of Contact: {DPO_CONTACT}</li>
          <li>
            National Privacy Commission (for data privacy complaints):{' '}
            <a href="https://www.privacy.gov.ph" target="_blank" rel="noreferrer">privacy.gov.ph</a>
          </li>
        </ul>
      </div>
    </main>
  )
}