import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { SquareService } from '../../services/square.service';
import { AuthService } from '../../services/auth.service';
import { LoggerService } from '../../services/logger.service';
import { CartItem, CreateOrderRequest, OrderResponse } from '../../models/square.model';

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
    private squareService: SquareService,
    private authService: AuthService,
    private router: Router,
    private logger: LoggerService
  ) {}

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
    this.squareService.getConfig().subscribe({
      next: cfg => this.initSquareCard(cfg.applicationId, cfg.locationId),
      error: err => {
        this.sdkError = 'Could not load payment configuration.';
        this.logger.error(this.source, 'getConfig failed', err);
      }
    });
  }

  private async initSquareCard(appId: string, locationId: string): Promise<void> {
    if (typeof Square === 'undefined') {
      this.sdkError = 'Square SDK not loaded. Please refresh and try again.';
      return;
    }
    try {
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
    if (!this.card) {
      this.error = 'Payment form is not ready. Please wait a moment and try again.';
      return;
    }

    this.submitting = true;
    this.error = '';

    try {
      // 1. Tokenize card via Square SDK
      const result = await this.card.tokenize();
      if (result.status !== 'OK') {
        const msgs = result.errors?.map((e: any) => e.message).join(', ') || 'Card tokenization failed.';
        this.error = msgs;
        this.submitting = false;
        return;
      }

      const sourceId = result.token;

      // 2. Send to backend — creates Square order, charges card, saves receipt
      const selectedLocation = this.cartService.getSelectedLocation();

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
        locationId:      selectedLocation?.id
      };

      this.squareService.createPayment(request).subscribe({
        next: (res: OrderResponse) => {
          this.cartService.clearCart();
          this.submitting = false;
          // Pass order data to confirmation page via navigation state
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
