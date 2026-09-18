import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ─── Rate Limiter ────────────────────────────────────────────────────────────
// Simple in-memory sliding-window rate limiter.
// Resets when the server restarts (acceptable for a project this size).

interface RateWindow {
  timestamps: number[];
}

const userWindows = new Map<string, RateWindow>();
const globalWindow: RateWindow = { timestamps: [] };

const RATE_LIMITS = {
  USER_PER_MINUTE: 3,    // max 3 generations per user per minute
  USER_PER_DAY: 100,     // max 100 generations per user per day
  GLOBAL_PER_MINUTE: 10, // max 10 generations across ALL users per minute
} as const;

function isRateLimited(
  userId: string
): { limited: boolean; retryAfterSec?: number; reason?: string } {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  const oneDayAgo = now - 86_400_000;

  // ── Global check ───────────────────────────────────────────────────────────
  globalWindow.timestamps = globalWindow.timestamps.filter((t) => t > oneMinuteAgo);
  if (globalWindow.timestamps.length >= RATE_LIMITS.GLOBAL_PER_MINUTE) {
    const oldest = globalWindow.timestamps[0];
    return {
      limited: true,
      retryAfterSec: Math.ceil((oldest + 60_000 - now) / 1000),
      reason: 'Too many AI requests globally. Please wait a moment.',
    };
  }

  // ── Per-user check ─────────────────────────────────────────────────────────
  if (!userWindows.has(userId)) {
    userWindows.set(userId, { timestamps: [] });
  }
  const userWin = userWindows.get(userId)!;

  // Per-minute
  const recentMinute = userWin.timestamps.filter((t) => t > oneMinuteAgo);
  if (recentMinute.length >= RATE_LIMITS.USER_PER_MINUTE) {
    const oldest = recentMinute[0];
    return {
      limited: true,
      retryAfterSec: Math.ceil((oldest + 60_000 - now) / 1000),
      reason: `You can generate up to ${RATE_LIMITS.USER_PER_MINUTE} stories per minute. Please wait.`,
    };
  }

  // Per-day
  const recentDay = userWin.timestamps.filter((t) => t > oneDayAgo);
  if (recentDay.length >= RATE_LIMITS.USER_PER_DAY) {
    return {
      limited: true,
      retryAfterSec: Math.ceil((recentDay[0] + 86_400_000 - now) / 1000),
      reason: `Daily AI generation limit (${RATE_LIMITS.USER_PER_DAY}) reached. Try again tomorrow.`,
    };
  }

  return { limited: false };
}

function recordRequest(userId: string) {
  const now = Date.now();
  globalWindow.timestamps.push(now);

  if (!userWindows.has(userId)) {
    userWindows.set(userId, { timestamps: [] });
  }
  userWindows.get(userId)!.timestamps.push(now);
}

// ─── Auth Helper ─────────────────────────────────────────────────────────────

async function getAuthenticatedAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* ignore in Route Handler context */ }
        },
      },
    }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { user: null, role: null };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return { user, role: profile?.role ?? 'guest' };
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // ── 1. Auth: require admin role ────────────────────────────────────────
    const { user, role } = await getAuthenticatedAdmin();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized — please sign in.' },
        { status: 401 }
      );
    }

    if (role !== 'admin' && role !== 'facilitator') {
      return NextResponse.json(
        { error: 'Forbidden — only admins can generate stories.' },
        { status: 403 }
      );
    }

    // ── 2. Rate limiting ───────────────────────────────────────────────────
    const rateCheck = isRateLimited(user.id);
    if (rateCheck.limited) {
      return NextResponse.json(
        { error: rateCheck.reason },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfterSec ?? 60),
          },
        }
      );
    }

    // ── 3. Parse request body ──────────────────────────────────────────────
    const body = await request.json();
    const { title, concept, genre, type = 'choices_only', sceneCount = 3 } = body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;

    // AI Generation System Instructions — written for ALL ages (6 to 60+)
    const systemPrompt = `You are a friendly storyteller who creates fun, easy-to-follow interactive stories that teach people about smart technology helpers (AI) through real-life situations.

Create an interactive learning story about: "${concept || title || 'Smart Helpers'}"
Story Title: "${title || 'AI Journey'}"
Genre: "${genre || 'Adventure'}"
Story Type: "${type}" (choices_only OR with_activity)
Number of Scenes: ${sceneCount}

AUDIENCE & READING LEVEL:
Your audience ranges from 6-year-old kids to 60+ year-old elders — the kind of people you would meet walking around a shopping mall.
- Use SHORT, SIMPLE sentences a young child can follow and an older adult can enjoy.
- Write at a Grade 2–3 reading level. Prefer familiar, everyday words.
- The tone should feel like a friendly older sibling or a kind teacher telling a story.

ABSOLUTELY BANNED WORDS AND JARGON — NEVER use any of these:
NLP, natural language processing, machine learning, deep learning, neural network, algorithm, dataset, data set, model training, supervised learning, unsupervised learning, reinforcement learning, classification, regression, tokenization, embeddings, inference, bias (use "unfair" instead), optimization, API, back-end, front-end, artificial intelligence (say "smart helper" or "smart tool" instead), prompt engineering, generative AI, large language model, LLM, GPT, transformer, parameters, fine-tuning, corpus, annotation, feature extraction, overfitting, gradient, epoch, batch size, hyperparameter, latent space, convolutional, recurrent, autoencoder, diffusion, vector, semantic, ontology, knowledge graph, computer vision, sentiment analysis.

Instead, use everyday comparisons:
- "Smart helper" or "smart tool" instead of "AI" or "artificial intelligence"
- "Learns from examples" instead of "trained on data"
- "Follows a recipe of steps" instead of "runs an algorithm"
- "Sorts things into groups" instead of "classification"
- "Remembers what people liked before" instead of "analyzes historical data"
- "Checks if it's being fair to everyone" instead of "audits for bias"

REAL-WORLD SETTING REQUIREMENT:
Every story MUST be set in a place and situation people encounter in daily life.
- Use relatable characters: kids, parents, teachers, store workers, nurses, farmers, neighbors, grandparents, delivery riders, etc.
- Set scenes in everyday places: schools, malls, markets, neighborhood shops, homes, clinics, parks, public buses, family kitchens, etc.
- Show how a "smart helper" solves an everyday problem — like helping pick the right gift, organizing a messy schedule, suggesting what to cook, finding the fastest route, or sorting recycling.
- Every scene should feel like something that could happen to anyone today.

CRITICAL RULES:
1. Generate ${sceneCount} distinct scenes.
2. Each scene MUST have EXACTLY 2 choices (Choice A / Left choice and Choice B / Right choice).
3. Choice A (Left choice) represents the careful, step-by-step path (weight: +1).
4. Choice B (Right choice) represents the creative, try-something-new path (weight: -1).
5. IMPORTANT: Choice labels must be plain, simple actions. NEVER include "(+1)", "(-1)", "Intellect", "Creative", weight numbers, or any scoring text in the label. Those are internal — the learner must never see them.
6. If Story Type is "with_activity", generate an activity object with TWO fun prompts:
   - intellectPrompt (for learners who mostly chose the step-by-step path, score >= 0): a hands-on question like "Draw your own smart helper" or "Write 3 steps to teach a helper to do something"
   - otherRoutePrompt (for learners who mostly chose the creative path, score < 0): an imaginative question like "Make up a story about a helper that surprises everyone" or "Describe a smart helper nobody has thought of yet"
7. The story body in each scene should be 2-3 short sentences, vivid and specific.
8. Choice labels should be everyday actions written in simple language — things a child or grandparent would understand.
9. Activity prompts should feel fun, not like homework. Use phrases like "In your own words…", "Draw or describe…", "Imagine…".

Return ONLY valid JSON matching this exact structure:
{
  "title": "Story Title",
  "category": "${concept || 'Smart Helpers'}",
  "level": "Starter",
  "type": "${type}",
  "description": "One simple sentence about what the story is about",
  "scenes": [
    {
      "id": "scene-1",
      "eyebrow": "SCENE 1 · THE BEGINNING",
      "title": "Scene Title",
      "body": "A short, vivid description of what is happening in simple words...",
      "choices": [
        { "id": "c1-a", "label": "A simple, careful action the person could take", "weight": 1 },
        { "id": "c1-b", "label": "A fun, creative action the person could try", "weight": -1 }
      ]
    }
  ],
  ${type === 'with_activity' ? `"activity": {
    "intellectPrompt": "A fun, hands-on question that asks the learner to explain or show what they learned in their own words...",
    "otherRoutePrompt": "A creative, imaginative question that asks the learner to dream up something new..."
  }` : `"activity": null`}
}`;

    // ── 4. Record the request AFTER validation, BEFORE the API call ────────
    recordRequest(user.id);
    const startTime = Date.now();

    // ── 5. Call the AI provider ────────────────────────────────────────────
    if (process.env.GEMINI_API_KEY) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const durationMs = Date.now() - startTime;

      if (res.ok) {
        const json = await res.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        const usage = json.usageMetadata;

        console.log('[AI Usage]', {
          userId: user.id,
          provider: 'gemini',
          model: 'gemini-2.0-flash',
          promptTokens: usage?.promptTokenCount ?? '?',
          outputTokens: usage?.candidatesTokenCount ?? '?',
          totalTokens: usage?.totalTokenCount ?? '?',
          durationMs,
          status: 'success',
        });

        if (rawText) {
          try {
            const parsed = JSON.parse(rawText);
            return NextResponse.json({ story: parsed });
          } catch (e) {
            console.error('[AI Story Gen] Failed to parse Gemini response:', rawText);
            return NextResponse.json({ error: 'Failed to parse AI response from Gemini' }, { status: 500 });
          }
        }
      } else {
        const errorText = await res.text();
        console.error('[AI Usage]', {
          userId: user.id,
          provider: 'gemini',
          model: 'gemini-2.0-flash',
          durationMs,
          status: 'error',
          error: errorText.slice(0, 200),
        });
        return NextResponse.json({ error: 'Failed to generate story from Gemini API' }, { status: 500 });
      }
    } else if (process.env.GROQ_API_KEY) {
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [{ role: 'user', content: systemPrompt }],
          response_format: { type: "json_object" }
        })
      });

      const durationMs = Date.now() - startTime;

      if (res.ok) {
        const json = await res.json();
        const rawText = json.choices?.[0]?.message?.content;
        const usage = json.usage;

        // Groq returns { prompt_tokens, completion_tokens, total_tokens }
        const promptTokens = usage?.prompt_tokens ?? 0;
        const outputTokens = usage?.completion_tokens ?? 0;
        const totalTokens = usage?.total_tokens ?? 0;

        // Estimated cost based on Groq pricing: $0.15/M input, $0.60/M output
        const estimatedCostUsd =
          (promptTokens * 0.15 + outputTokens * 0.60) / 1_000_000;

        console.log('[AI Usage]', {
          userId: user.id,
          provider: 'groq',
          model: 'openai/gpt-oss-120b',
          promptTokens,
          outputTokens,
          totalTokens,
          estimatedCostUsd: `$${estimatedCostUsd.toFixed(6)}`,
          durationMs,
          status: 'success',
        });

        if (rawText) {
          try {
            const parsed = JSON.parse(rawText);
            return NextResponse.json({ story: parsed });
          } catch (e) {
            console.error('[AI Story Gen] Failed to parse Groq response:', rawText);
            return NextResponse.json({ error: 'Failed to parse AI response from Groq' }, { status: 500 });
          }
        }
      } else {
        const errorText = await res.text();
        console.error('[AI Usage]', {
          userId: user.id,
          provider: 'groq',
          model: 'openai/gpt-oss-120b',
          durationMs,
          status: 'error',
          error: errorText.slice(0, 200),
        });
        return NextResponse.json({ error: 'Failed to generate story from Groq API' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'No API key configured for AI generation.' }, { status: 500 });
    }

    return NextResponse.json({ error: 'Empty response from AI.' }, { status: 500 });

  } catch (err: any) {
    console.error('[AI Story Gen] Error during generation:', err?.message);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
