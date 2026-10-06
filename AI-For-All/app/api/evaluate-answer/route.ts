import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storyTitle, category, activityPrompt, userAnswer } = body;

    const systemPrompt = `You are an encouraging AI assistant in an educational app called 'AI-For-All'.
The user has just completed a story called "${storyTitle}" about the AI concept: "${category}".
At the end of the story, they were asked: "${activityPrompt}"
The user answered: "${userAnswer}"

Your task is to respond to their answer like a friendly, informative teacher. 
Please structure your response to include:
1. An encouraging opening that directly references their answer to show you "listened".
2. A detailed and informative explanation of the AI concept ("${category}") that was explored in the story.
3. A simple, everyday comparison explaining how this concept relates to the real world (e.g., comparing an AI to a chef following a recipe, or a librarian sorting books).

CRITICAL RULES:
- Aim for 2-4 short, easy-to-read paragraphs.
- Do NOT use technical jargon (e.g., no NLP, LLM, parameters, machine learning).
- Use a Grade 3-4 reading level so it is highly accessible.

Respond with ONLY the text of your feedback. No JSON formatting, no prefixes.`;

    // Try Gemini first
    if (process.env.GEMINI_API_KEY) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }]
        })
      });

      if (res.ok) {
        const json = await res.json();
        const feedback = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (feedback) {
          return NextResponse.json({ feedback });
        }
      }
    }
    // Fallback to Groq
    else if (process.env.GROQ_API_KEY) {
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b', // Match story generation model
          messages: [{ role: 'user', content: systemPrompt }]
        })
      });

      if (res.ok) {
        const json = await res.json();
        const feedback = json.choices?.[0]?.message?.content;
        if (feedback) {
          return NextResponse.json({ feedback });
        }
      }
    }

    return NextResponse.json({ error: 'Failed to generate feedback.' }, { status: 500 });
  } catch (err: any) {
    console.error('[Evaluate Answer Error]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
