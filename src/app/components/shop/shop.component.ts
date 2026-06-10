import { Component, OnInit } from '@angular/core';
import { SquareService } from '../../services/square.service';
import { CartService } from '../../services/cart.service';
import { LoggerService } from '../../services/logger.service';
import { SquareCatalogItem, SquareVariation, CartItem, StoreLocation } from '../../models/square.model';

@Component({
  selector: 'app-shop',
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.scss']
})
export class ShopComponent implements OnInit {
  private readonly source = 'ShopComponent';

  // ── Store picker state
  locations: StoreLocation[] = [];
  locationsLoading = true;
  locationsError = '';
  selectedLocation: StoreLocation | null = null;

  // ── Catalog state
  items: SquareCatalogItem[] = [];
  filtered: SquareCatalogItem[] = [];
  categories: { id: string; name: string }[] = [];
  catalogLoading = false;
  catalogError = '';
  searchQuery = '';
  selectedCategory = '';

  // ── Cart
  cartOpen = false;
  cartCount = 0;

  selectedVariations: { [itemId: string]: SquareVariation } = {};
  addedFeedback: { [itemId: string]: boolean } = {};

  constructor(
    private squareService: SquareService,
    private cartService: CartService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.logger.trace(this.source, '>>> ngOnInit()');
    this.cartService.cartCount$.subscribe(c => (this.cartCount = c));

    // Restore previously selected location (persisted in localStorage)
    const saved = this.cartService.getSelectedLocation();
    if (saved) {
      this.selectedLocation = saved;
    }

    this.loadLocations();
  }

  private loadLocations(): void {
    this.locationsLoading = true;
    this.squareService.getLocations().subscribe({
      next: locs => {
        this.locations = locs;
        this.locationsLoading = false;

        // If a saved location is still in the list, load its catalog automatically
        if (this.selectedLocation) {
          const stillValid = locs.find(l => l.id === this.selectedLocation!.id);
          if (stillValid) {
            this.loadCatalog();
          } else {
            this.selectedLocation = null;
            this.cartService.clearLocation();
          }
        }
      },
      error: err => {
        this.locationsError = 'Could not load stores. Check Square credentials.';
        this.locationsLoading = false;
        this.logger.error(this.source, 'loadLocations failed', err);
      }
    });
  }

  selectStore(loc: StoreLocation): void {
    this.cartService.selectLocation(loc);
    this.selectedLocation = loc;
    this.searchQuery = '';
    this.selectedCategory = '';
    this.items = [];
    this.filtered = [];
    this.selectedVariations = {};
    this.loadCatalog();
  }

  changeStore(): void {
    this.selectedLocation = null;
    this.cartService.clearLocation();
    this.items = [];
    this.filtered = [];
    this.catalogError = '';
  }

  private loadCatalog(): void {
    this.catalogLoading = true;
    this.catalogError = '';
    this.squareService.getCatalog().subscribe({
      next: items => {
        this.items = items;
        items.forEach(item => {
          if (item.variations?.length) {
            this.selectedVariations[item.id] = item.variations[0];
          }
        });
        this.applyFilter();
        this.catalogLoading = false;
      },
      error: err => {
        this.catalogError = 'Could not load catalog.';
        this.catalogLoading = false;
        this.logger.error(this.source, 'loadCatalog failed', err);
      }
    });
    this.squareService.getCategories().subscribe({
      next: cats => (this.categories = cats),
      error: err => this.logger.warn(this.source, 'loadCategories failed', err)
    });
  }

  onSearch(): void { this.applyFilter(); }

  onCategoryChange(catId: string): void {
    this.selectedCategory = catId;
    this.applyFilter();
  }

  private applyFilter(): void {
    let result = this.items;
    if (this.selectedCategory) {
      result = result.filter(i => i.categoryId === this.selectedCategory);
    }
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q)
      );
    }
    this.filtered = result;
  }

  selectVariation(item: SquareCatalogItem, variation: SquareVariation): void {
    this.selectedVariations[item.id] = variation;
  }

  getSelectedVariation(item: SquareCatalogItem): SquareVariation | null {
    return this.selectedVariations[item.id] || item.variations?.[0] || null;
  }

  addToCart(item: SquareCatalogItem): void {
    const variation = this.getSelectedVariation(item);
    if (!variation) return;
    const cartItem: CartItem = {
      variationId:   variation.id,
      itemId:        item.id,
      itemName:      item.name,
      variationName: variation.name,
      unitPrice:     variation.price,
      quantity:      1,
      imageUrl:      item.imageUrl
    };
    this.cartService.addItem(cartItem);
    this.addedFeedback[item.id] = true;
    setTimeout(() => delete this.addedFeedback[item.id], 1200);
  }

  openCart(): void  { this.cartOpen = true; }
  closeCart(): void { this.cartOpen = false; }
}
