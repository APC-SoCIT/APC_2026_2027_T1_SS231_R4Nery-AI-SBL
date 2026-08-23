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
        console.error('[AI Story Gen] Gemini API error:', errorText);
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

      if (res.ok) {
        const json = await res.json();
        const rawText = json.choices?.[0]?.message?.content;
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
        console.error('[AI Story Gen] Groq API error:', errorText);
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



