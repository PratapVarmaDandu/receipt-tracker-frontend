import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrganizationService } from '../../services/organization.service';
import { LoggerService } from '../../services/logger.service';
import { OrgOrder } from '../../models/organization.model';

@Component({
  selector: 'app-admin-orders',
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.scss']
})
export class AdminOrdersComponent implements OnInit {
  private readonly source = 'AdminOrdersComponent';

  slug = '';
  orders: OrgOrder[] = [];
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orgService: OrganizationService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug')!;
    this.load();
  }

  goBack(): void { this.router.navigate(['/admin/org', this.slug]); }

  load(): void {
    this.loading = true;
    this.orgService.getOrgOrders(this.slug).subscribe({
      next: orders => { this.orders = orders; this.loading = false; },
      error: err => {
        this.error = err?.error?.error || 'Failed to load orders.';
        this.loading = false;
        this.logger.error(this.source, 'load failed', err);
      }
    });
  }

  viewReceipt(receiptId: number | null): void {
    if (receiptId) this.router.navigate(['/receipts', receiptId]);
  }

  statusClass(status: string): string {
    return status === 'COMPLETED' ? 'badge-success' :
           status === 'REFUNDED'  ? 'badge-warning' : 'badge-secondary';
  }

  formatAmount(amount: number): string {
    return '$' + Number(amount).toFixed(2);
  }
}
