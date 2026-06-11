import { Component, OnInit } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { CartService } from '../../services/cart.service';
import { OrganizationService } from '../../services/organization.service';
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
    private cartService: CartService,
    private orgService: OrganizationService,
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

  // Returns true when the selected store has both Square + Clover configured
  get hasMultipleProviders(): boolean {
    return !!(this.selectedLocation?.providers && this.selectedLocation.providers.length > 1);
  }

  private loadLocations(): void {
    this.locationsLoading = true;
    this.locationsError = '';

    // All locations come from per-org Square / Clover credentials — no global env-var fallback
    this.orgService.listMine().pipe(
      switchMap(orgs => {
        const sqCalls = orgs
          .filter(o => o.squareConfigured)
          .map(org => this.orgService.getOrgLocations(org.slug).pipe(
            map((locs: any[]) => locs.map(l => ({ ...l, orgSlug: org.slug, provider: 'square' as const } as StoreLocation))),
            catchError(() => of([] as StoreLocation[]))
          ));

        const cloverCalls = orgs
          .filter(o => o.cloverConfigured)
          .map(org => this.orgService.getOrgCloverLocations(org.slug).pipe(
            map((locs: any[]) => locs.map(l => ({ ...l, orgSlug: org.slug, provider: 'clover' as const } as StoreLocation))),
            catchError(() => of([] as StoreLocation[]))
          ));

        const all = [...sqCalls, ...cloverCalls];
        if (all.length === 0) return of([] as StoreLocation[]);
        return forkJoin(all).pipe(
          map(results => ([] as StoreLocation[]).concat(...results))
        );
      }),
      catchError(() => of([] as StoreLocation[]))
    ).subscribe(orgLocs => {
      // Deduplicate by orgSlug — merge Square + Clover for the same org into one entry
      const orgLocBySlug = new Map<string, StoreLocation>();
      for (const loc of orgLocs) {
        if (!loc.orgSlug) continue;
        const existing = orgLocBySlug.get(loc.orgSlug);
        if (existing) {
          const currentProviders: ('square' | 'clover')[] =
            existing.providers ?? (existing.provider ? [existing.provider] : []);
          const newProvider = loc.provider;
          if (newProvider && !currentProviders.includes(newProvider)) {
            existing.providers = [...currentProviders, newProvider];
            delete existing.provider;
          }
        } else {
          orgLocBySlug.set(loc.orgSlug, { ...loc });
        }
      }

      this.locations = Array.from(orgLocBySlug.values());
      this.locationsLoading = false;

      if (this.selectedLocation) {
        const stillValid = this.locations.find(l => l.id === this.selectedLocation!.id);
        if (stillValid) {
          this.selectedLocation = { ...stillValid };
          this.cartService.selectLocation(stillValid);
          this.loadCatalog();
        } else {
          this.selectedLocation = null;
          this.cartService.clearLocation();
        }
      }

      if (this.locations.length === 0) {
        this.locationsError = 'No stores available. Set up Square or Clover credentials in Admin → your Org.';
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
    this.categories = [];
  }

  private loadCatalog(): void {
    this.catalogLoading = true;
    this.catalogError = '';

    const loc       = this.selectedLocation!;
    const orgSlug   = loc.orgSlug;
    const providers = loc.providers;
    const provider  = loc.provider;

    if (!orgSlug) {
      // Should not happen — all locations are org-scoped now
      this.catalogError = 'No store configuration found.';
      this.catalogLoading = false;
      return;
    }

    let catalog$: Observable<SquareCatalogItem[]>;

    if (providers && providers.length > 1) {
      // Org has both Square + Clover — fetch in parallel, merge, stamp source
      const calls: Observable<SquareCatalogItem[]>[] = [];
      if (providers.includes('square')) {
        calls.push(this.orgService.getOrgCatalog(orgSlug).pipe(
          map((items: any[]) => items.map(i => ({ ...i, source: 'square' as const }))),
          catchError(() => of([] as SquareCatalogItem[]))
        ));
      }
      if (providers.includes('clover')) {
        calls.push(this.orgService.getOrgCloverCatalog(orgSlug).pipe(
          map((items: any[]) => items.map(i => ({ ...i, source: 'clover' as const }))),
          catchError(() => of([] as SquareCatalogItem[]))
        ));
      }
      catalog$ = forkJoin(calls).pipe(
        map(results => ([] as SquareCatalogItem[]).concat(...results))
      );
    } else if (provider === 'clover') {
      catalog$ = this.orgService.getOrgCloverCatalog(orgSlug).pipe(
        map((items: any[]) => items.map(i => ({ ...i, source: 'clover' as const })))
      );
    } else {
      catalog$ = this.orgService.getOrgCatalog(orgSlug).pipe(
        map((items: any[]) => items.map(i => ({ ...i, source: 'square' as const }))),
        catchError(err => { throw err; })
      );
    }

    catalog$.subscribe({
      next: items => {
        this.items = items;
        items.forEach(item => {
          if (item.variations?.length) {
            this.selectedVariations[item.id] = item.variations[0];
          }
        });
        // Derive categories from items
        const catMap = new Map<string, string>();
        items.forEach(item => {
          if (item.categoryId && item.categoryName) catMap.set(item.categoryId, item.categoryName);
        });
        this.categories = Array.from(catMap.entries()).map(([id, name]) => ({ id, name }));
        this.applyFilter();
        this.catalogLoading = false;
      },
      error: err => {
        this.catalogError = err?.error?.error || 'Could not load catalog. Check your POS credentials.';
        this.catalogLoading = false;
        this.logger.error(this.source, 'loadCatalog failed', err);
      }
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
      imageUrl:      item.imageUrl,
      source:        item.source
    };
    this.cartService.addItem(cartItem);
    this.addedFeedback[item.id] = true;
    setTimeout(() => delete this.addedFeedback[item.id], 1200);
  }

  openCart(): void  { this.cartOpen = true; }
  closeCart(): void { this.cartOpen = false; }
}
