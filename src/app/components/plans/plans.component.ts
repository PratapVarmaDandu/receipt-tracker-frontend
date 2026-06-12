import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FeatureService } from '../../services/feature.service';
import { SubscriptionService } from '../../services/subscription.service';
import { LoggerService } from '../../services/logger.service';
import { PlatformSquareConfig } from '../../models/platform.model';

declare const Square: any;

interface PlanCard {
  key: string;       // AppFeature name or 'FULL_SUITE'
  planId: string;    // planId field name on PlatformSquareConfig
  label: string;
  icon: string;
  price: string;
  blurb: string;
  features: string[];   // AppFeature keys this plan grants
}

const PLAN_CARDS: PlanCard[] = [
  {
    key: 'GARAGE',
    planId: 'planIdGarage',
    label: 'My Garage',
    icon: 'bi-speedometer2',
    price: '$9/mo',
    blurb: 'Track vehicle maintenance, fuel economy, safety recalls and generate sale-ready history reports.',
    features: ['GARAGE']
  },
  {
    key: 'DOCUMENT_VAULT',
    planId: 'planIdVault',
    label: 'Document Vault',
    icon: 'bi-folder2-open',
    price: '$9/mo',
    blurb: 'Secure storage for tax documents, resumes, income records and immigration paperwork with expiry tracking.',
    features: ['DOCUMENT_VAULT']
  },
  {
    key: 'JOB_TRACKER',
    planId: 'planIdJobs',
    label: 'Job Tracker',
    icon: 'bi-briefcase',
    price: '$5/mo',
    blurb: 'Manage job applications, interview rounds and follow-ups on a kanban board.',
    features: ['JOB_TRACKER']
  },
  {
    key: 'FULL_SUITE',
    planId: 'planIdSuite',
    label: 'Full Suite',
    icon: 'bi-stars',
    price: '$19/mo',
    blurb: 'All four features: Garage, Document Vault, Job Tracker and Expense Sharing — best value.',
    features: ['GARAGE', 'DOCUMENT_VAULT', 'JOB_TRACKER', 'EXPENSE_SHARING']
  }
];

@Component({
  selector: 'app-plans',
  templateUrl: './plans.component.html',
  styleUrls: ['./plans.component.scss']
})
export class PlansComponent implements OnInit, OnDestroy {
  private readonly source = 'PlansComponent';

  plans = PLAN_CARDS;
  squareConfig: PlatformSquareConfig | null = null;
  configError = '';

  selectedPlan: PlanCard | null = null;
  cardReady = false;
  submitting = false;
  sdkError = '';
  successMessage = '';
  error = '';

  private payments: any = null;
  private card: any = null;

  constructor(
    public featureService: FeatureService,
    private subscriptionService: SubscriptionService,
    private router: Router,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.featureService.ensureLoaded().subscribe();
    this.subscriptionService.getSquareConfig().subscribe({
      next: cfg => {
        this.squareConfig = cfg;
        if (!cfg.configured) {
          this.configError = 'Payments are not available yet. Please check back soon.';
        }
      },
      error: () => {
        this.configError = 'Could not load payment configuration.';
      }
    });
  }

  isPlanOwned(plan: PlanCard): boolean {
    return plan.features.every(f => this.featureService.has(f));
  }

  selectPlan(plan: PlanCard): void {
    if (this.isPlanOwned(plan)) return;
    if (!this.squareConfig?.configured) return;
    this.selectedPlan = plan;
    this.cardReady = false;
    this.sdkError = '';
    this.error = '';
    // init SDK after DOM update
    setTimeout(() => this.initSquareCard(), 50);
  }

  cancelSelection(): void {
    this.selectedPlan = null;
    this.destroyCard();
  }

  private loadSquareSdk(env: string): Promise<void> {
    if (typeof Square !== 'undefined') return Promise.resolve();
    return new Promise((resolve, reject) => {
      const url = env === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';
      const existing = document.querySelector(`script[src="${url}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject());
        return;
      }
      const s = document.createElement('script');
      s.src = url;
      s.onload  = () => resolve();
      s.onerror = () => reject(new Error('Square SDK failed to load'));
      document.head.appendChild(s);
    });
  }

  private async initSquareCard(): Promise<void> {
    const cfg = this.squareConfig;
    if (!cfg?.applicationId || !cfg?.locationId) {
      this.sdkError = 'Payment configuration is incomplete.';
      return;
    }
    const env = (cfg.environment || 'SANDBOX').toLowerCase();
    try {
      await this.loadSquareSdk(env);
      this.payments = Square.payments(cfg.applicationId, cfg.locationId);
      this.card = await this.payments.card();
      await this.card.attach('#plans-card-container');
      this.cardReady = true;
      this.logger.info(this.source, 'Square card element attached');
    } catch (e: any) {
      this.sdkError = 'Failed to load payment form: ' + (e?.message || e);
      this.logger.error(this.source, 'Square card init failed', e);
    }
  }

  async subscribe(): Promise<void> {
    if (!this.card || !this.selectedPlan) return;
    const cfg = this.squareConfig;
    const planIdField = this.selectedPlan.planId as keyof PlatformSquareConfig;
    const planId = cfg?.[planIdField] as string | undefined;
    if (!planId) {
      this.error = 'This plan is not available yet.';
      return;
    }

    this.submitting = true;
    this.error = '';
    try {
      const result = await this.card.tokenize();
      if (result.status !== 'OK') {
        this.error = result.errors?.map((e: any) => e.message).join(', ') || 'Card tokenization failed.';
        this.submitting = false;
        return;
      }

      this.subscriptionService.purchase(result.token, planId).subscribe({
        next: () => {
          this.featureService.reload().subscribe(() => {
            this.successMessage = `${this.selectedPlan!.label} activated! Enjoy your new features.`;
            this.selectedPlan = null;
            this.submitting = false;
            this.destroyCard();
          });
        },
        error: err => {
          this.error = err?.error?.error || 'Subscription failed. Please try again.';
          this.submitting = false;
          this.logger.error(this.source, 'purchase failed', err);
        }
      });
    } catch (e: any) {
      this.error = 'An unexpected error occurred: ' + (e?.message || e);
      this.submitting = false;
    }
  }

  private destroyCard(): void {
    if (this.card) {
      this.card.destroy().catch(() => {});
      this.card = null;
    }
    this.cardReady = false;
  }

  ngOnDestroy(): void {
    this.destroyCard();
  }
}
