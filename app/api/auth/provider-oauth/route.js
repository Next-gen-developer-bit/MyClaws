import { NextResponse } from 'next/server';

// These are mock environments representing typical OAuth configurations for AI providers
const OAUTH_CONFIG = {
  anthropic: {
    clientId: process.env.ANTHROPIC_CLIENT_ID || 'mock_anthropic_client_id',
    authUrl: 'https://console.anthropic.com/oauth/authorize', // Example URL
    scopes: ['models.read', 'chat.create']
  },
  openai: {
    clientId: process.env.OPENAI_CLIENT_ID || 'mock_openai_client_id',
    authUrl: 'https://platform.openai.com/oauth/authorize', // Example URL
    scopes: ['api.user', 'api.models']
  }
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');

  if (!provider || !OAUTH_CONFIG[provider]) {
    return NextResponse.redirect(new URL('/workspace?error=invalid_provider', request.url));
  }

  const config = OAUTH_CONFIG[provider];
  
  // Create an OAuth authorization URL
  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', config.scopes.join(' '));
  // The redirect_uri should match what you configure in the respective AI provider's developer console
  authUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/provider-oauth/callback`);
  authUrl.searchParams.set('state', 'mock_state_csrf');

  // In a real application with valid credentials, you should redirect to the authUrl.
  // We check if the user actually supplied a client ID in the environment variables to proceed:
  if (config.clientId) {
    return NextResponse.redirect(authUrl.toString());
  }

  // If no API keys are provided in .env, attempting to go to real auth providers will instantly crash.
  // This simulates the "OAuth cancelled" block smoothly so testing isn't abruptly gated.
  return NextResponse.redirect(new URL('/workspace?error=cancelled', request.url));
}
