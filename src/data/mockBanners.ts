import { OfferBanner } from '../types';

export const INITIAL_BANNERS: OfferBanner[] = [
  {
    id: 'banner-01',
    title: 'Festival Earning Bonus: +₹5 Extra Per Review!',
    subtitle: 'Upgrade to 1 Month Master Earner today & receive priority queue on high-value Amazon & Flipkart drops.',
    badge: 'LIMITED TIME DEAL 🔥',
    imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'Claim 50% Bonus Plan',
    targetAction: 'open_plans',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'banner-02',
    title: 'Instant UPI Payouts within 15 Minutes!',
    subtitle: 'Complete 10 reviews today and get instant zero-fee payout directly to your Google Pay or PhonePe.',
    badge: 'SPECIAL PROMO ⚡',
    imageUrl: 'https://images.unsplash.com/photo-1556742049-0a67e557224f?auto=format&fit=crop&w=1200&q=80',
    ctaText: 'View Payout Gateways',
    targetAction: 'open_plans',
    active: true,
    createdAt: new Date().toISOString(),
  },
];
