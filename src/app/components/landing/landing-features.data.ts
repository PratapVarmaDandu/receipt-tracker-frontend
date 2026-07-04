export type AudienceKey = 'individuals' | 'students' | 'business' | 'immigration';

export interface Audience {
  key: AudienceKey;
  label: string;
  icon: string;
}

export interface FeatureCard {
  icon: string;
  title: string;
  description: string;
  points: string[];
  audiences: AudienceKey[];
}

export const AUDIENCES: Audience[] = [
  { key: 'individuals', label: 'Individuals',              icon: 'bi-person' },
  { key: 'students',    label: 'Students & Job Seekers',    icon: 'bi-mortarboard' },
  { key: 'business',    label: 'Small Business & Teams',    icon: 'bi-building' },
  { key: 'immigration', label: 'Employers & Law Firms',     icon: 'bi-passport' }
];

export const FEATURES: FeatureCard[] = [
  {
    icon: 'bi-receipt',
    title: 'Smart Receipt Tracking',
    description: 'Snap a photo and let OCR + AI do the data entry. See exactly where your money goes.',
    points: [
      'OCR + Claude Vision line-item extraction',
      'Cashback optimization across your cards',
      'Split any receipt with friends, roommates, or family'
    ],
    audiences: ['individuals', 'students']
  },
  {
    icon: 'bi-folder2-open',
    title: 'Document Vault',
    description: 'A secure home for resumes, tax records, and immigration paperwork, with expiry reminders built in.',
    points: [
      'Track W-2s, 1099s, passports & visas',
      'Automatic expiry alerts',
      'Share a document via a secure, expiring link'
    ],
    audiences: ['individuals', 'students', 'immigration']
  },
  {
    icon: 'bi-speedometer2',
    title: 'My Garage',
    description: 'Full vehicle lifecycle tracking, maintenance, fuel economy, and recalls, powered by free NHTSA data.',
    points: [
      'VIN decoder & OEM maintenance schedule',
      'Automatic MPG from fill-ups',
      'Live NHTSA safety recall lookups'
    ],
    audiences: ['individuals']
  },
  {
    icon: 'bi-briefcase',
    title: 'Job Application Tracker',
    description: 'Every application, interview, and follow-up in one board, linked straight to your resume versions.',
    points: [
      'Kanban or table view, your choice',
      'Interview rounds & prep notes',
      'Never miss a follow-up date'
    ],
    audiences: ['students']
  },
  {
    icon: 'bi-shop',
    title: 'In-App Shop',
    description: 'Pay in-store or online through Square and Clover. Your receipt is created automatically.',
    points: [
      'Tokenized card payments via Square',
      'Pay-at-store with Clover',
      'No manual receipt entry, ever'
    ],
    audiences: ['business']
  },
  {
    icon: 'bi-building',
    title: 'Organization Portal',
    description: 'Bring your whole team onto one workspace with role-based access and a shared point of sale.',
    points: [
      'Owner / Admin / Staff / Viewer roles',
      'Team invites by email',
      'Centralized order history'
    ],
    audiences: ['business']
  },
  {
    icon: 'bi-passport',
    title: 'Immigration Case Tracker',
    description: 'Purpose-built case management for H-1B and green card journeys, for attorneys, employers, and beneficiaries.',
    points: [
      'Secure, multi-party access model',
      'Auto-filled USCIS filing packages',
      'Document scanning & full audit trail'
    ],
    audiences: ['immigration']
  }
];
