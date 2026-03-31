import { NextResponse } from 'next/server';

export async function POST(request) {
  const { channel, token } = await request.json();

  if (!channel || !token || token.trim() === '') {
    return NextResponse.json({ valid: false, error: 'Channel and token are required.' }, { status: 400 });
  }

  try {
    if (channel === 'telegram') {
      // Telegram: getMe endpoint returns {"ok":true,"result":{...}} for valid tokens
      const res = await fetch(`https://api.telegram.org/bot${token.trim()}/getMe`, {
        signal: AbortSignal.timeout(8000),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.ok === true) {
        const botUsername = body?.result?.username || '';
        const botFirstName = body?.result?.first_name || '';
        return NextResponse.json({ valid: true, info: `@${botUsername} (${botFirstName})`, botName: botFirstName || botUsername });
      }
      const msg = body?.description || 'Invalid Telegram bot token.';
      return NextResponse.json({ valid: false, error: msg });
    }

    if (channel === 'discord') {
      // Discord: GET /users/@me with Bot token – returns 200 for valid tokens
      const res = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `Bot ${token.trim()}`,
        },
        signal: AbortSignal.timeout(8000),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.id) {
        const botTag = body?.username ? `${body.username}#${body.discriminator || '0000'}` : '';
        return NextResponse.json({ valid: true, info: botTag, botName: body?.username || '' });
      }
      const msg = body?.message || 'Invalid Discord bot token.';
      return NextResponse.json({ valid: false, error: msg });
    }

    return NextResponse.json({ valid: false, error: 'Unknown channel.' }, { status: 400 });
  } catch (err) {
    const isTimeout = err?.name === 'TimeoutError';
    return NextResponse.json(
      {
        valid: false,
        error: isTimeout
          ? 'Request timed out. Check your network and try again.'
          : 'Validation failed. Please check the token and try again.',
      },
      { status: 500 }
    );
  }
}
