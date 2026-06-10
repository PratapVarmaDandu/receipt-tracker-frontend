import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OrderResponse } from '../../models/square.model';

@Component({
  selector: 'app-order-confirmation',
  templateUrl: './order-confirmation.component.html',
  styleUrls: ['./order-confirmation.component.scss']
})
export class OrderConfirmationComponent implements OnInit {
  order: OrderResponse | null = null;

  constructor(private router: Router) {
    // Read order data passed via router navigation state (no sessionStorage needed)
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as { order?: OrderResponse } | undefined;
    if (state?.order) {
      this.order = state.order;
    }
  }

  ngOnInit(): void {
    // Fallback: if navigated directly without state (e.g. browser refresh)
    // order stays null and the generic success message is shown
  }

  goToReceipt(): void {
    if (this.order?.receiptId) {
      this.router.navigate(['/receipts', this.order.receiptId]);
    }
  }

  goToShop(): void {
    this.router.navigate(['/shop']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
