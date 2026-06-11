import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { OrganizationService } from '../../services/organization.service';
import { AuthService } from '../../services/auth.service';
import { LoggerService } from '../../services/logger.service';
import { CartItem, CreateOrderRequest, OrderResponse } from '../../models/square.model';
import { Observable } from 'rxjs';

declare const Square: any;

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly source = 'CheckoutComponent';

  items: CartItem[] = [];
  total = 0;

  fulfillmentType: 'PICKUP' | 'DELIVERY' = 'PICKUP';
  recipientName = '';
  recipientEmail = '';
  recipientPhone = '';
  deliveryAddress = '';
  note = '';

  cardReady = false;
  submitting = false;
  error = '';
  sdkError = '';

  private payments: any = null;
  private card: any = null;

  constructor(
    public cartService: CartService,
    private orgService: OrganizationService,
    private authService: AuthService,
    private router: Router,
    private logger: LoggerService
  ) {}

  // ── Cart composition helpers ──────────────────────────────────────────────

  /** All items in the cart are from Clover — pay at store. */
  get isCloverOnlyCart(): boolean {
    return this.items.length > 0 && this.items.every(i => i.source === 'clover');
  }

  /** Cart has items from both Square and Clover simultaneously. */
  get hasMixedCart(): boolean {
    return this.items.some(i => i.source === 'clover') &&
           this.items.some(i => i.source !== 'clover');
  }

  /** Button enabled: either Square card is ready, or it's a Clover pay-at-store order. */
  get canPlaceOrder(): boolean {
    return !this.submitting && this.items.length > 0 &&
           (this.cardReady || this.isCloverOnlyCart);
  }

  ngOnInit(): void {
    this.cartService.cart$.subscribe(items => {
      this.items = items;
      if (items.length === 0 && !this.submitting) {
        this.router.navigate(['/shop']);
      }
    });
    this.cartService.cartTotal$.subscribe(t => (this.total = t));

    const user = this.authService.getSnapshot();
    if (user) {
      this.recipientName  = user.name  || '';
      this.recipientEmail = user.email || '';
    }
  }

  ngAfterViewInit(): void {
    // Clover-only or mixed carts don't need Square SDK
    if (this.isCloverOnlyCart || this.hasMixedCart) return;

    const selectedLocation = this.cartService.getSelectedLocation();
    const orgSlug   = selectedLocation?.orgSlug;
    const provider  = selectedLocation?.provider;
    const providers = selectedLocation?.providers;

    // Purely-Clover store with no items yet — nothing to init
    const isCloverOnlyStore =
      provider === 'clover' ||
      (providers && providers.length === 1 && providers[0] === 'clover');
    if (isCloverOnlyStore) return;

    // All Square config is per-org — no global env-var fallback
    if (!orgSlug) {
      this.sdkError = 'No store selected. Please go back and choose a store.';
      return;
    }
    this.orgService.getSquareConfig(orgSlug).subscribe({
      next: cfg => {
        if (!cfg.configured || !cfg.applicationId || !cfg.locationId) {
          this.sdkError = 'Square is not fully configured for this organization.';
          return;
        }
        this.initSquareCard(cfg.applicationId, cfg.locationId, (cfg.environment || 'sandbox').toLowerCase());
      },
      error: err => {
        this.sdkError = 'Could not load payment configuration.';
        this.logger.error(this.source, 'getSquareConfig (org) failed', err);
      }
    });
  }

  /** Dynamically injects the Square SDK script if it hasn't loaded yet.
   *  In Docker/prod the index.html placeholder is already replaced at startup,
   *  so typeof Square !== 'undefined' and this resolves immediately. */
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
      s.onerror = () => reject(new Error('Square SDK failed to load from ' + url));
      document.head.appendChild(s);
    });
  }

  private async initSquareCard(appId: string, locationId: string, env = 'sandbox'): Promise<void> {
    try {
      await this.loadSquareSdk(env);
      this.payments = Square.payments(appId, locationId);
      this.card = await this.payments.card();
      await this.card.attach('#square-card-container');
      this.cardReady = true;
      this.logger.info(this.source, 'Square card element attached');
    } catch (e: any) {
      this.sdkError = 'Failed to load payment form: ' + (e?.message || e);
      this.logger.error(this.source, 'Square card init failed', e);
    }
  }

  async placeOrder(): Promise<void> {
    if (!this.recipientName.trim() || !this.recipientEmail.trim()) {
      this.error = 'Name and email are required.';
      return;
    }
    if (this.fulfillmentType === 'DELIVERY' && !this.deliveryAddress.trim()) {
      this.error = 'Delivery address is required.';
      return;
    }

    if (this.hasMixedCart) {
      this.error = 'Your cart has Square and Clover items. Please remove one type to checkout.';
      return;
    }

    const selectedLocation = this.cartService.getSelectedLocation();
    const orgSlug = selectedLocation?.orgSlug;

    // ── Clover pay-at-store path ───────────────────────────────────────────
    if (this.isCloverOnlyCart) {
      this.submitting = true;
      this.error = '';

      const request = {
        items: this.items.map(i => ({
          variationId:   i.variationId,
          itemName:      i.itemName,
          variationName: i.variationName,
          quantity:      i.quantity,
          unitPrice:     i.unitPrice
        })),
        fulfillmentType: this.fulfillmentType,
        recipientName:   this.recipientName.trim(),
        recipientEmail:  this.recipientEmail.trim(),
        recipientPhone:  this.recipientPhone.trim() || undefined,
        deliveryAddress: this.fulfillmentType === 'DELIVERY' ? this.deliveryAddress.trim() : undefined,
        note:            this.note.trim() || undefined
      };

      this.orgService.createOrgCloverOrder(orgSlug!, request).subscribe({
        next: (res: OrderResponse) => {
          this.cartService.clearCart();
          this.submitting = false;
          this.router.navigate(['/shop/order'], { state: { order: res, payAtStore: true } });
        },
        error: err => {
          this.submitting = false;
          this.error = err?.error?.error || 'Could not place order. Please try again.';
          this.logger.error(this.source, 'createOrgCloverOrder failed', err);
        }
      });
      return;
    }

    // ── Square payment path ────────────────────────────────────────────────
    if (!this.card) {
      this.error = 'Payment form is not ready. Please wait a moment and try again.';
      return;
    }

    this.submitting = true;
    this.error = '';

    try {
      const result = await this.card.tokenize();
      if (result.status !== 'OK') {
        const msgs = result.errors?.map((e: any) => e.message).join(', ') || 'Card tokenization failed.';
        this.error = msgs;
        this.submitting = false;
        return;
      }

      const sourceId = result.token;

      const request: CreateOrderRequest = {
        items: this.items.map(i => ({
          variationId:   i.variationId,
          itemName:      i.itemName,
          variationName: i.variationName,
          quantity:      i.quantity,
          unitPrice:     i.unitPrice
        })),
        fulfillmentType: this.fulfillmentType,
        recipientName:   this.recipientName.trim(),
        recipientEmail:  this.recipientEmail.trim(),
        recipientPhone:  this.recipientPhone.trim() || undefined,
        deliveryAddress: this.fulfillmentType === 'DELIVERY' ? this.deliveryAddress.trim() : undefined,
        note:            this.note.trim() || undefined,
        sourceId,
        locationId: selectedLocation?.id
      };

      // All payments are org-scoped — orgSlug is always set at this point
      const payment$: Observable<OrderResponse> = this.orgService.createOrgPayment(orgSlug!, request);

      payment$.subscribe({
        next: (res: OrderResponse) => {
          this.cartService.clearCart();
          this.submitting = false;
          this.router.navigate(['/shop/order'], { state: { order: res } });
        },
        error: err => {
          this.submitting = false;
          this.error = err?.error?.error || 'Payment failed. Please check your card details and try again.';
          this.logger.error(this.source, 'createPayment failed', err);
        }
      });
    } catch (e: any) {
      this.submitting = false;
      this.error = 'An unexpected error occurred: ' + (e?.message || e);
      this.logger.error(this.source, 'placeOrder exception', e);
    }
  }

  ngOnDestroy(): void {
    if (this.card) {
      this.card.destroy().catch(() => {});
    }
  }

  backToShop(): void {
    this.router.navigate(['/shop']);
  }
}
