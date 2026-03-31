import { NextResponse } from 'next/server';

export async function POST(request) {
  const { model, key } = await request.json();

  if (!model || !key || key.trim() === '') {
    return NextResponse.json({ valid: false, error: 'Model and key are required.' }, { status: 400 });
  }

  try {
    if (model === 'claude') {
      // Anthropic: hit /v1/models – returns 200 for a valid key
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return NextResponse.json({ valid: true });
      const body = await res.json().catch(() => ({}));
      const msg = body?.error?.message || 'Invalid Anthropic API key.';
      return NextResponse.json({ valid: false, error: msg });
    }

    if (model === 'chatgpt') {
      // OpenAI: hit /v1/models – returns 200 for a valid key
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${key}`,
        },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return NextResponse.json({ valid: true });
      const body = await res.json().catch(() => ({}));
      const msg = body?.error?.message || 'Invalid OpenAI API key.';
      return NextResponse.json({ valid: false, error: msg });
    }

    if (model === 'gemini') {
      // Google: list models with the key as a query param
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(key)}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) return NextResponse.json({ valid: true });
      const body = await res.json().catch(() => ({}));
      const msg = body?.error?.message || 'Invalid Google Gemini API key.';
      return NextResponse.json({ valid: false, error: msg });
    }

    return NextResponse.json({ valid: false, error: 'Unknown model.' }, { status: 400 });
  } catch (err) {
    const isTimeout = err?.name === 'TimeoutError';
    return NextResponse.json(
      { valid: false, error: isTimeout ? 'Request timed out. Check your network and try again.' : 'Validation failed.' },
      { status: 500 }
    );
  }
}
