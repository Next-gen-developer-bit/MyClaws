import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request) {
  try {
    const { deploymentId, messages } = await request.json();

    if (!deploymentId || !messages?.length) {
      return NextResponse.json({ error: 'Missing deploymentId or messages.' }, { status: 400 });
    }

    // Load the deployment to get ai_model, api_key and system_prompt
    const { data: dep, error: depErr } = await supabaseAdmin
      .from('claw_deployments')
      .select('ai_model, api_key, system_prompt, bot_name')
      .eq('id', deploymentId)
      .single();

    if (depErr || !dep) {
      console.error('[Chat] Deployment fetch error:', depErr?.message || 'No deployment found');
      return NextResponse.json({ error: `Deployment not found. Details: ${depErr?.message}` }, { status: 404 });
    }

    const { ai_model, api_key, system_prompt, bot_name } = dep;

    // Build the conversation payload and call the appropriate AI provider
    const systemMsg = system_prompt || `You are ${bot_name || 'a helpful AI assistant'}.`;

    // ── Anthropic (Claude) ──
    if (ai_model === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': api_key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1024,
          system: systemMsg,
          messages: messages.filter(m => m.role !== 'system'),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('[Chat/Claude] Error:', data);
        return NextResponse.json({ error: data?.error?.message || 'Claude API error.' }, { status: 500 });
      }
      const reply = data.content?.[0]?.text || '';
      return NextResponse.json({ reply });
    }

    // ── OpenAI (ChatGPT) ──
    if (ai_model === 'chatgpt') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemMsg }, ...messages.filter(m => m.role !== 'system')],
          max_tokens: 1024,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('[Chat/OpenAI] Error:', data);
        return NextResponse.json({ error: data?.error?.message || 'OpenAI API error.' }, { status: 500 });
      }
      const reply = data.choices?.[0]?.message?.content || '';
      return NextResponse.json({ reply });
    }

    // ── Google (Gemini) ──
    if (ai_model === 'gemini') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${api_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemMsg }] },
            contents: messages
              .filter(m => m.role !== 'system')
              .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
              })),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        console.error('[Chat/Gemini] Error:', data);
        return NextResponse.json({ error: data?.error?.message || 'Gemini API error.' }, { status: 500 });
      }
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return NextResponse.json({ reply });
    }

    return NextResponse.json({ error: `Unknown AI model: ${ai_model}` }, { status: 400 });
  } catch (err) {
    console.error('[Chat] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
