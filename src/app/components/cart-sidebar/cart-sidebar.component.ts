import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { CartItem } from '../../models/square.model';

@Component({
  selector: 'app-cart-sidebar',
  templateUrl: './cart-sidebar.component.html',
  styleUrls: ['./cart-sidebar.component.scss']
})
export class CartSidebarComponent implements OnInit {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  items: CartItem[] = [];
  total = 0;

  constructor(private cartService: CartService, private router: Router) {}

  ngOnInit(): void {
    this.cartService.cart$.subscribe(items => (this.items = items));
    this.cartService.cartTotal$.subscribe(t => (this.total = t));
  }

  updateQty(variationId: string, qty: number): void {
    this.cartService.updateQuantity(variationId, qty);
  }

  remove(variationId: string): void {
    this.cartService.removeItem(variationId);
  }

  checkout(): void {
    this.closed.emit();
    this.router.navigate(['/shop/checkout']);
  }

  close(): void {
    this.closed.emit();
  }
}
