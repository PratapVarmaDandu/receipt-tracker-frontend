import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CartItem, StoreLocation } from '../models/square.model';
import { LoggerService } from './logger.service';

const STORAGE_KEY      = 'squareCart';
const LOCATION_KEY     = 'squareLocation';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly source = 'CartService';

  private cartSubject     = new BehaviorSubject<CartItem[]>(this.loadFromStorage());
  private locationSubject = new BehaviorSubject<StoreLocation | null>(this.loadLocationFromStorage());

  cart$:     Observable<CartItem[]>        = this.cartSubject.asObservable();
  location$: Observable<StoreLocation | null> = this.locationSubject.asObservable();

  cartCount$: Observable<number> = this.cart$.pipe(
    map(items => items.reduce((sum, i) => sum + i.quantity, 0))
  );

  cartTotal$: Observable<number> = this.cart$.pipe(
    map(items => items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0))
  );

  constructor(private logger: LoggerService) {}

  getSelectedLocation(): StoreLocation | null {
    return this.locationSubject.getValue();
  }

  selectLocation(loc: StoreLocation): void {
    const current = this.locationSubject.getValue();
    if (current?.id !== loc.id) {
      this.persist([]);   // clear cart when switching stores
      this.logger.info(this.source, `Switched location to ${loc.name}`);
    }
    localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
    this.locationSubject.next(loc);
  }

  clearLocation(): void {
    localStorage.removeItem(LOCATION_KEY);
    this.locationSubject.next(null);
    this.persist([]);
  }

  private loadLocationFromStorage(): StoreLocation | null {
    try {
      const raw = localStorage.getItem(LOCATION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  getSnapshot(): CartItem[] {
    return this.cartSubject.getValue();
  }

  addItem(item: CartItem): void {
    const current = this.cartSubject.getValue();
    const existing = current.find(i => i.variationId === item.variationId);
    let updated: CartItem[];
    if (existing) {
      updated = current.map(i =>
        i.variationId === item.variationId
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
      );
    } else {
      updated = [...current, { ...item }];
    }
    this.persist(updated);
    this.logger.debug(this.source, `addItem variationId=${item.variationId} qty=${item.quantity}`);
  }

  updateQuantity(variationId: string, quantity: number): void {
    if (quantity < 1) {
      this.removeItem(variationId);
      return;
    }
    const updated = this.cartSubject.getValue().map(i =>
      i.variationId === variationId ? { ...i, quantity } : i
    );
    this.persist(updated);
  }

  removeItem(variationId: string): void {
    const updated = this.cartSubject.getValue().filter(i => i.variationId !== variationId);
    this.persist(updated);
    this.logger.debug(this.source, `removeItem variationId=${variationId}`);
  }

  clearCart(): void {
    this.persist([]);
    this.logger.info(this.source, 'Cart cleared');
  }

  private persist(items: CartItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    this.cartSubject.next(items);
  }

  private loadFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
