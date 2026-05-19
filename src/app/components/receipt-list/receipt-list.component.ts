import { Component, OnInit } from '@angular/core';
import { Receipt, STORE_TYPE_ICONS, STORE_TYPE_LABELS, STORE_TYPE_CSS } from '../../models/receipt.model';
import { ReceiptService } from '../../services/receipt.service';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-receipt-list',
  templateUrl: './receipt-list.component.html',
  styleUrls: ['./receipt-list.component.scss']
})
export class ReceiptListComponent implements OnInit {
  private readonly source = 'ReceiptListComponent';
  
  receipts: Receipt[] = [];
  filtered: Receipt[] = [];
  loading = true;
  searchText = '';
  filterType = '';
  sortBy = 'date';

  storeIcons = STORE_TYPE_ICONS;
  storeLabels = STORE_TYPE_LABELS;
  storeCss = STORE_TYPE_CSS;
  storeTypes = Object.entries(STORE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));

  constructor(
    private receiptService: ReceiptService,
    private logger: LoggerService
  ) {}

  ngOnInit() {
    this.logger.trace(this.source, 'ngOnInit() - Initializing receipt list');
    const startTime = Date.now();
    
    this.receiptService.getAll().subscribe({
      next: (data) => {
        const duration = Date.now() - startTime;
        this.logger.info(this.source, `Loaded ${data.length} receipts in ${duration}ms`);
        this.receipts = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        const duration = Date.now() - startTime;
        this.logger.error(this.source, `Failed to load receipts after ${duration}ms`, error);
        this.loading = false;
      }
    });
  }

  applyFilters() {
    this.logger.trace(this.source, 
      `applyFilters() - search="${this.searchText}", type="${this.filterType}", sort="${this.sortBy}"`);
    
    let result = [...this.receipts];
    
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      result = result.filter(r =>
        r.storeName?.toLowerCase().includes(q) ||
        r.cardBank?.toLowerCase().includes(q) ||
        r.paymentCard?.toLowerCase().includes(q)
      );
      this.logger.debug(this.source, `Search filter: "${q}" matched ${result.length} receipts`);
    }
    
    if (this.filterType) {
      result = result.filter(r => r.storeType === this.filterType);
      this.logger.debug(this.source, `Type filter: "${this.filterType}" matched ${result.length} receipts`);
    }
    
    if (this.sortBy === 'date') {
      result.sort((a, b) => new Date(b.purchaseDateTime).getTime() - new Date(a.purchaseDateTime).getTime());
    } else if (this.sortBy === 'total') {
      result.sort((a, b) => (b.total || 0) - (a.total || 0));
    } else if (this.sortBy === 'cashback') {
      result.sort((a, b) => (b.cashbackEarned || 0) - (a.cashbackEarned || 0));
    }
    this.logger.trace(this.source, `Sort by "${this.sortBy}": ${result.length} results`);
    
    this.filtered = result;
  }

  totalSpend(): number {
    const total = this.filtered.reduce((s, r) => s + (r.total || 0), 0);
    this.logger.trace(this.source, `totalSpend() = ${total}`);
    return total;
  }

  totalCashback(): number {
    const total = this.filtered.reduce((s, r) => s + (r.cashbackEarned || 0), 0);
    this.logger.trace(this.source, `totalCashback() = ${total}`);
    return total;
  }

  totalPotential(): number {
    const total = this.filtered.reduce((s, r) => s + (r.potentialCashback || 0), 0);
    this.logger.trace(this.source, `totalPotential() = ${total}`);
    return total;
  }

  delete(id: number | undefined, e: Event) {
    e.stopPropagation();
    if (!id) {
      this.logger.warn(this.source, 'delete() - No receipt ID provided');
      return;
    }
    if (!confirm('Delete this receipt?')) {
      this.logger.trace(this.source, `delete(${id}) - Cancelled by user`);
      return;
    }
    
    this.logger.info(this.source, `delete(${id}) - Deleting receipt`);
    this.receiptService.delete(id).subscribe({
      next: () => {
        this.logger.info(this.source, `delete(${id}) - SUCCESS`);
        this.receipts = this.receipts.filter(r => r.id !== id);
        this.applyFilters();
      },
      error: (error) => {
        this.logger.error(this.source, `delete(${id}) - FAILED`, error);
      }
    });
  }
}
