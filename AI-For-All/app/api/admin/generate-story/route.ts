import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, concept, genre, type = 'choices_only', sceneCount = 3 } = body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;

    // AI Generation System Instructions
    const systemPrompt = `You are an AI learning story generator for students.
Create an interactive learning story about: "${concept || title || 'Artificial Intelligence'}"
Story Title: "${title || 'AI Journey'}"
Genre: "${genre || 'Adventure'}"
Story Type: "${type}" (choices_only OR with_activity)
Number of Scenes: ${sceneCount}

CRITICAL RULES:
1. Generate ${sceneCount} distinct scenes.
2. Each scene MUST have EXACTLY 2 choices (Choice A / Left choice and Choice B / Right choice).
3. Choice A (Left choice) represents the Intellect / Structured path (weight: +1).
4. Choice B (Right choice) represents the Creative / Exploratory path (weight: -1).
5. If Story Type is "with_activity", generate an activity object with TWO free-text prompts:
   - intellectPrompt (for learners with cumulative weight score >= 0)
   - otherRoutePrompt (for learners with cumulative weight score < 0)

Return ONLY valid JSON matching this exact structure:
{
  "title": "Story Title",
  "category": "${concept || 'AI Basics'}",
  "level": "Starter",
  "type": "${type}",
  "description": "Short description of what the story teaches",
  "scenes": [
    {
      "id": "scene-1",
      "eyebrow": "SCENE 1 · INTRODUCTION",
      "title": "Scene Title",
      "body": "Detailed scene narration text...",
      "choices": [
        { "id": "c1-a", "label": "Structured/Intellect choice (+1)", "weight": 1 },
        { "id": "c1-b", "label": "Exploratory/Creative choice (-1)", "weight": -1 }
      ]
    }
  ],
  ${type === 'with_activity' ? `"activity": {
    "intellectPrompt": "Intellect Route Activity: Free-text prompt...",
    "otherRoutePrompt": "Creative Route Activity: Free-text prompt..."
  }` : `"activity": null`}
}`;

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

      if (res.ok) {
        const json = await res.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          return NextResponse.json({ story: parsed });
        }
      }
    }

    // Fallback AI Story Generator if API Key is rate limited or missing
    const generatedStory = createSmartFallbackStory({ title, concept, genre, type, sceneCount });
    return NextResponse.json({ story: generatedStory });

  } catch (err: any) {
    console.warn('[AI Story Gen] Using template generator fallback due to error:', err?.message);
    const body = await request.clone().json().catch(() => ({}));
    const generatedStory = createSmartFallbackStory(body);
    return NextResponse.json({ story: generatedStory });
  }
}

function createSmartFallbackStory(params: any) {
  const { title = 'The AI Quest', concept = 'Machine Learning', type = 'choices_only', sceneCount = 3 } = params;

  const scenes = [];
  const count = Math.max(1, Math.min(5, Number(sceneCount) || 3));

  for (let i = 1; i <= count; i++) {
    scenes.push({
      id: `scene-${i}`,
      eyebrow: `SCENE ${i} · ${i === 1 ? 'DISCOVERY' : i === count ? 'CONCLUSION' : 'DECISION'}`,
      title: i === 1 ? `Understanding ${concept}` : i === count ? `Applying ${concept}` : `Testing ${concept}`,
      body: `Scene ${i}: You are exploring how ${concept} can solve real-world challenges. As you test different prompts and data inputs, you notice distinct outcomes depending on how you structure your ideas.`,
      choices: [
        {
          id: `c${i}-a`,
          label: `Option A: Analyze patterns with structured data (+1 Intellect)`,
          weight: 1
        },
        {
          id: `c${i}-b`,
          label: `Option B: Experiment freely with creative examples (-1 Creative)`,
          weight: -1
        }
      ]
    });
  }

  return {
    id: `story-${Date.now()}`,
    title: title || `Exploring ${concept}`,
    category: concept || 'AI Basics',
    level: 'Starter',
    type: type === 'with_activity' ? 'with_activity' : 'choices_only',
    description: `An interactive learning story exploring ${concept}.`,
    color: '#79a8ff',
    image: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design%20%2889%29%201-VY50vMtptXr0tOsB2AUUCKt4I96OmQ.png',
    status: 'Published',
    updatedAt: 'Just now',
    createdAt: new Date().toISOString(),
    skillsBuildUrl: 'https://skillsbuild.org',
    skillsBuildButtonText: 'Explore Course on IBM SkillsBuild',
    scenes,
    ...(type === 'with_activity' ? {
      activity: {
        intellectPrompt: `Intellect Route Activity: Explain 2 key principles of ${concept} that help AI models deliver accurate, reliable outputs.`,
        otherRoutePrompt: `Creative Route Activity: Write a creative prompt that demonstrates how ${concept} can inspire original artistic or storytelling ideas.`
      }
    } : {})
  };
}
