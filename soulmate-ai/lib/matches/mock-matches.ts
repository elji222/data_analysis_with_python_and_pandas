import type { MatchRecommendation } from '@/types/match';

// Dev-only sample data for UI previews and future tests. Never shown in production UI.
export const MOCK_MATCHES: MatchRecommendation[] = [
  {
    id: 'match-1',
    name: 'Maya Cohen',
    age: 29,
    location: 'Tel Aviv',
    compatibilitySummary:
      'Thoughtful, curious, and emotionally open — likely to appreciate deep conversation without rushing intimacy.',
    reasons: [
      'Both value honest reflection and slow-building trust',
      'Similar rhythm of life: creative work mixed with quiet evenings',
      'Shared interest in meaningful travel, not just sightseeing',
      'Complementary communication styles — direct but warm',
    ],
    matchStrength: 'strong',
    status: 'new',
    profile: {
      bio: 'Product designer who loves long walks, good coffee, and conversations that go past small talk.',
      interests: ['Design', 'Hiking', 'Books', 'Cooking'],
      visibility: 'friends',
      lookingFor: 'Someone kind, curious, and emotionally present.',
    },
  },
  {
    id: 'match-2',
    name: 'Daniel Rosen',
    age: 31,
    location: 'Jerusalem',
    compatibilitySummary:
      'Grounded and intellectually playful — a strong fit if you want steady energy with room for spontaneity.',
    reasons: [
      'Both lean thoughtful rather than performative on dates',
      'Overlap in values around family and community',
      'Enjoys learning new things and asking good questions',
      'Likely to respect boundaries while staying engaged',
    ],
    matchStrength: 'worth_exploring',
    status: 'new',
    profile: {
      bio: 'Teacher and weekend musician. Into history podcasts, farmers markets, and finding the best hummus in town.',
      interests: ['Music', 'History', 'Food', 'Community'],
      visibility: 'public',
      lookingFor: 'A genuine connection with humor and depth.',
    },
  },
  {
    id: 'match-3',
    name: 'Noa Shalev',
    age: 27,
    location: 'Haifa',
    compatibilitySummary:
      'Calm, observant, and creative — worth revisiting when you have bandwidth for someone gentle but independent.',
    reasons: [
      'Shared appreciation for art, nature, and unhurried weekends',
      'Similar preference for a few close friendships over a busy social calendar',
      'Communicates with empathy and patience',
    ],
    matchStrength: 'worth_exploring',
    status: 'saved',
    profile: {
      bio: 'Marine biologist with a soft spot for film photography and seaside sunsets.',
      interests: ['Ocean', 'Photography', 'Film', 'Yoga'],
      visibility: 'friends',
      lookingFor: 'Someone patient who enjoys quiet adventures.',
    },
  },
  {
    id: 'match-4',
    name: 'Yael Ben-Ami',
    age: 30,
    location: 'Beit Shemesh',
    compatibilitySummary:
      'Warm and community-oriented — your intro request is pending while they review your profile.',
    reasons: [
      'Lives nearby and shares a similar daily rhythm',
      'Values kindness, faith, and family without being rigid',
      'Enjoys hosting friends and meaningful one-on-one time',
      'Likely to appreciate your thoughtful communication style',
    ],
    matchStrength: 'strong',
    status: 'waiting',
    profile: {
      bio: 'Social worker who loves baking, volunteering, and long Shabbat dinners with friends.',
      interests: ['Community', 'Baking', 'Volunteering', 'Hiking'],
      visibility: 'friends',
      lookingFor: 'A partner who is caring, grounded, and family-minded.',
    },
  },
  {
    id: 'match-5',
    name: 'Avi Mizrahi',
    age: 32,
    location: 'Ramat Gan',
    compatibilitySummary:
      'You both opted in — this introduction is active and ready for a first thoughtful conversation.',
    reasons: [
      'Mutual interest in building something real, not chasing novelty',
      'Compatible lifestyles: active weekdays, restorative weekends',
      'Shared humor style — dry, warm, and self-aware',
      'Both open about feelings without making every chat heavy',
    ],
    matchStrength: 'strong',
    status: 'active',
    profile: {
      bio: 'Startup operator with a big heart. Runs, reads, and never misses a chance to recommend a great restaurant.',
      interests: ['Running', 'Startups', 'Food', 'Reading'],
      visibility: 'public',
      lookingFor: 'Honesty, laughter, and a partner in everyday life.',
    },
  },
];
