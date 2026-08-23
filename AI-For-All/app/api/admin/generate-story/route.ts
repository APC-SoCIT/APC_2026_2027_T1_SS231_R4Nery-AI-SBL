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

REAL-WORLD APPLICATION REQUIREMENT:
Every story MUST be set in a realistic, practical, real-world scenario where AI is applied to solve a tangible problem.
- Use relatable characters (students, teachers, nurses, small business owners, farmers, community workers, etc.).
- Set scenes in everyday environments (schools, hospitals, barangay offices, sari-sari stores, farms, public transport systems, local businesses, etc.).
- Show how AI concepts are used in real-world applications — for example: a student building a chatbot for their school's enrollment system, a nurse using AI to triage patients, a farmer using crop prediction AI, a jeepney route optimizer, a barangay complaint tracker with AI classification, etc.
- Make the story feel like something that could actually happen in real life. Do NOT write abstract or generic descriptions. Every scene should describe a concrete situation with specific details.
- Choices should reflect real decisions a person would face when applying AI in that scenario.

CRITICAL RULES:
1. Generate ${sceneCount} distinct scenes.
2. Each scene MUST have EXACTLY 2 choices (Choice A / Left choice and Choice B / Right choice).
3. Choice A (Left choice) represents the Intellect / Structured path (weight: +1).
4. Choice B (Right choice) represents the Creative / Exploratory path (weight: -1).
5. If Story Type is "with_activity", generate an activity object with TWO free-text prompts:
   - intellectPrompt (for learners with cumulative weight score >= 0)
   - otherRoutePrompt (for learners with cumulative weight score < 0)
6. The story body in each scene should be 2-4 sentences long, vivid, and describe a specific real-world situation.
7. Choice labels should be practical actions a person could take in that real-world scenario, not abstract concepts.

Return ONLY valid JSON matching this exact structure:
{
  "title": "Story Title",
  "category": "${concept || 'AI Basics'}",
  "level": "Starter",
  "type": "${type}",
  "description": "Short description of what the story teaches through a real-world scenario",
  "scenes": [
    {
      "id": "scene-1",
      "eyebrow": "SCENE 1 · INTRODUCTION",
      "title": "Scene Title",
      "body": "Detailed scene narration describing a specific real-world situation where AI is being applied...",
      "choices": [
        { "id": "c1-a", "label": "Practical structured action (+1)", "weight": 1 },
        { "id": "c1-b", "label": "Practical creative/exploratory action (-1)", "weight": -1 }
      ]
    }
  ],
  ${type === 'with_activity' ? `"activity": {
    "intellectPrompt": "Intellect Route Activity: A hands-on prompt asking the learner to apply what they learned to a real-world scenario...",
    "otherRoutePrompt": "Creative Route Activity: A creative prompt asking the learner to imagine or design a real-world AI solution..."
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

  // Real-world scenario templates for the fallback generator
  const scenarioTemplates = [
    {
      eyebrowTag: 'THE SETUP',
      titleTemplate: (c: string) => `Discovering ${c} in Action`,
      bodyTemplate: (c: string) => `You are a student interning at a local community health center. The clinic receives hundreds of patient records daily, and the staff is overwhelmed. Your supervisor asks you to explore how ${c} could help organize and prioritize patient cases more efficiently.`,
      choiceA: `Gather and label existing patient data to train a classification model (+1 Intellect)`,
      choiceB: `Brainstorm creative AI-powered triage ideas with the medical staff (-1 Creative)`,
    },
    {
      eyebrowTag: 'DECISION POINT',
      titleTemplate: (c: string) => `Applying ${c} to Real Data`,
      bodyTemplate: (c: string) => `After initial research, you realize the clinic's data has inconsistencies — some records are incomplete and others use different formats. You need to decide how to prepare this data before applying ${c} techniques.`,
      choiceA: `Clean and standardize the dataset using systematic rules (+1 Intellect)`,
      choiceB: `Experiment with the raw data and see what patterns emerge (-1 Creative)`,
    },
    {
      eyebrowTag: 'TESTING',
      titleTemplate: (c: string) => `Testing Your ${c} Solution`,
      bodyTemplate: (c: string) => `Your prototype is ready for testing. The clinic nurses try using your ${c} tool during a busy Monday morning. Some love it, but others find it confusing. You need to decide how to improve the system based on their feedback.`,
      choiceA: `Collect structured feedback surveys and analyze common pain points (+1 Intellect)`,
      choiceB: `Shadow the nurses for a day and redesign the interface based on observation (-1 Creative)`,
    },
    {
      eyebrowTag: 'SCALING UP',
      titleTemplate: (c: string) => `Expanding ${c} Impact`,
      bodyTemplate: (c: string) => `Your tool is working well at the clinic. The barangay captain hears about it and asks if you could adapt your ${c} solution for the local health office to serve multiple barangays in the area.`,
      choiceA: `Design a modular system architecture that can handle multiple locations (+1 Intellect)`,
      choiceB: `Create a simplified version first and let each barangay customize it (-1 Creative)`,
    },
    {
      eyebrowTag: 'CONCLUSION',
      titleTemplate: (c: string) => `The Future of ${c}`,
      bodyTemplate: (c: string) => `Your project is a success. The Department of Health notices your work and invites you to present how ${c} improved community healthcare. You reflect on the journey and what made your approach effective.`,
      choiceA: `Present data-driven results showing measurable improvements (+1 Intellect)`,
      choiceB: `Share personal stories from patients and nurses whose lives improved (-1 Creative)`,
    },
  ];

  const scenes = [];
  const count = Math.max(1, Math.min(5, Number(sceneCount) || 3));

  for (let i = 0; i < count; i++) {
    const template = scenarioTemplates[i % scenarioTemplates.length];
    scenes.push({
      id: `scene-${i + 1}`,
      eyebrow: `SCENE ${i + 1} · ${template.eyebrowTag}`,
      title: template.titleTemplate(concept),
      body: template.bodyTemplate(concept),
      choices: [
        {
          id: `c${i + 1}-a`,
          label: template.choiceA,
          weight: 1
        },
        {
          id: `c${i + 1}-b`,
          label: template.choiceB,
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
    description: `An interactive story where you apply ${concept} to solve real-world problems in a community health center.`,
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
        intellectPrompt: `Intellect Route Activity: You've been asked to present your ${concept} project to a panel of health officials. Write a 3-step plan explaining how you would implement your AI solution in another community, including what data you'd collect and how you'd measure success.`,
        otherRoutePrompt: `Creative Route Activity: Imagine you're designing an AI-powered health assistant app for senior citizens in your barangay. Describe what features it would have, how it would use ${concept}, and how you'd make it easy for lolas and lolos to use.`
      }
    } : {})
  };
}

