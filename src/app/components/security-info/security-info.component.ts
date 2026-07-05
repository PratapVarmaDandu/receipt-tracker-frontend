import { Component } from '@angular/core';

interface SecuritySection {
  icon: string;
  title: string;
  summary: string;
  points: string[];
}

interface ThirdPartyRow {
  name: string;
  purpose: string;
  dataShared: string;
  optional: boolean;
}

@Component({
  selector: 'app-security-info',
  templateUrl: './security-info.component.html',
  styleUrls: ['./security-info.component.scss']
})
export class SecurityInfoComponent {
  readonly sections: SecuritySection[] = [
    {
      icon: 'bi-google',
      title: 'Sign-in & sessions',
      summary: 'We never see or store a password.',
      points: [
        'Sign-in is Google OAuth2 only — we receive your name, email, and profile photo from Google, nothing else.',
        'After login you get a secure session cookie; there are no long-lived tokens (no JWTs) that could be replayed if leaked.',
        'The session cookie is httpOnly and marked secure in production, and is cleared immediately on sign-out.'
      ]
    },
    {
      icon: 'bi-lock-fill',
      title: 'Encryption at rest',
      summary: 'Sensitive fields are encrypted before they ever reach the database.',
      points: [
        'Passport numbers, SSNs, alien numbers, and EAD card numbers (immigration module) are encrypted with AES-256-GCM.',
        'Connected third-party credentials — Square/Clover access tokens, any linked cloud storage keys — are encrypted the same way, never stored as plain text.',
        'Only application code holding the server-side encryption key can decrypt these fields; they are unreadable directly in the database.'
      ]
    },
    {
      icon: 'bi-credit-card-2-front-fill',
      title: 'Payment data',
      summary: 'Card numbers never touch our servers.',
      points: [
        'When you check out with a connected Square store, your card is tokenized directly in your browser by Square’s own payment SDK.',
        'Our backend receives only an opaque, single-use payment token — never a raw card number.'
      ]
    },
    {
      icon: 'bi-stars',
      title: 'Optional AI-assisted scanning',
      summary: 'Off by default, and never used to train anything.',
      points: [
        'Receipt and document scanning can optionally use Claude (Anthropic) to read the image and extract fields like store name, amount, or document type.',
        'This is disabled unless explicitly turned on, and only the image needed for that one scan is sent — it is not retained by us afterward.',
        'If it’s off, or a scan fails, we fall back to on-device OCR (Tesseract) or basic pattern matching — nothing goes to a third party.'
      ]
    },
    {
      icon: 'bi-journal-check',
      title: 'Audit trail (immigration cases)',
      summary: 'Every sensitive change is logged — but the log itself never stores your data.',
      points: [
        'Field-level changes to immigration case data are recorded in an append-only audit log — entries can’t be edited or deleted.',
        'Sensitive values are stored in the log only as a one-way SHA-256 hash, never the value itself.',
        'The audit trail for a case is only visible to that case’s attorney or firm admin.'
      ]
    },
    {
      icon: 'bi-folder-fill',
      title: 'File storage',
      summary: 'Uploaded files are never stored under a guessable name.',
      points: [
        'Every uploaded receipt, document, or photo is renamed to a random ID on upload — your original filename is never used as a storage path.',
        'File type is checked against an allow-list (PDF, common image formats, Office docs) before anything is accepted.'
      ]
    }
  ];

  readonly thirdParties: ThirdPartyRow[] = [
    { name: 'Google', purpose: 'Sign-in', dataShared: 'Handled entirely by Google’s login flow', optional: false },
    { name: 'Anthropic (Claude)', purpose: 'Optional AI receipt/document scanning', dataShared: 'The single image being scanned, for that request only', optional: true },
    { name: 'Square / Clover', purpose: 'In-app checkout', dataShared: 'Card token only (tokenized in your browser); never raw card numbers', optional: true },
    { name: 'NHTSA (US Gov)', purpose: 'Vehicle lookups & recalls', dataShared: 'Vehicle make/model/year/VIN only — no personal information', optional: true },
    { name: 'Gmail', purpose: 'Invite & share emails', dataShared: 'Tokenized invite links; if not configured, nothing is sent', optional: true },
    { name: 'USCIS (US Gov)', purpose: 'Immigration form-version checks', dataShared: 'None — one-way public PDF download only', optional: false }
  ];
}
