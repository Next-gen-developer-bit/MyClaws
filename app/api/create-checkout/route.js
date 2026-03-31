import { NextResponse } from 'next/server';
import { Creem } from 'creem';

export async function POST(request) {
  try {
    const body = await request.json();
    const { productId, successUrl, metadata } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const creem = new Creem({
      apiKey: process.env.CREEM_API_KEY,
      // 0 = production, 1 = test mode
      serverIdx: process.env.NODE_ENV === 'production' ? 0 : 1,
    });

    const checkout = await creem.checkouts.create({
      productId,
      successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/setup/success`,
      metadata: metadata || {},
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkout.checkoutUrl,
    });
  } catch (error) {
    console.error('Creem checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
