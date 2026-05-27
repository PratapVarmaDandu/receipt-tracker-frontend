import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { AnalyticsData, CashbackSuggestion } from '../../models/receipt.model';
import { AnalyticsService } from '../../services/analytics.service';
import { ExpenseShareService } from '../../services/expense-share.service';
import { ExpenseShare } from '../../models/expense-share.model';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('spendingByCategory') catCanvas!: ElementRef;
  @ViewChild('spendingByMonth')    monthCanvas!: ElementRef;
  @ViewChild('cashbackByCard')     cardCanvas!: ElementRef;

  analytics: AnalyticsData | null = null;
  loading = true;
  selectedRange = '12';
  pendingShares: ExpenseShare[] = [];

  private charts: Chart[] = [];

  constructor(
    private analyticsService: AnalyticsService,
    private shareService: ExpenseShareService
  ) {}

  ngOnInit() {
    this.load();
    this.loadPendingShares();
  }

  loadPendingShares(): void {
    this.shareService.getMyShares().subscribe(shares => {
      this.pendingShares = shares.filter(s =>
        s.status === 'PENDING' || s.status === 'CHANGE_APPROVED' || s.status === 'CHANGE_REJECTED'
      );
    });
  }

  ngAfterViewInit() {
    if (this.analytics) this.drawCharts();
  }

  load() {
    this.loading = true;
    const from = new Date();
    from.setMonth(from.getMonth() - Number(this.selectedRange));
    this.analyticsService.getAnalytics(from.toISOString(), new Date().toISOString()).subscribe({
      next: (data) => {
        this.analytics = data;
        this.loading = false;
        setTimeout(() => this.drawCharts(), 50);
      },
      error: () => { this.loading = false; }
    });
  }

  drawCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
    if (!this.analytics) return;

    const PALETTE = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16'];

    // Spending by category (doughnut)
    if (this.catCanvas) {
      const labels = Object.keys(this.analytics.spendingByCategory).map(k => this.friendly(k));
      const values = Object.values(this.analytics.spendingByCategory).map(Number);
      this.charts.push(new Chart(this.catCanvas.nativeElement, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: PALETTE, borderWidth: 2 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'right', labels: { font: { size: 12 } } } }
        }
      }));
    }

    // Monthly spending (bar)
    if (this.monthCanvas) {
      const months = Object.keys(this.analytics.spendingByMonth);
      const amounts = Object.values(this.analytics.spendingByMonth).map(Number);
      this.charts.push(new Chart(this.monthCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [{
            label: 'Monthly Spend ($)',
            data: amounts,
            backgroundColor: '#4f46e5cc',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } } }
        }
      }));
    }

    // Cashback by card (horizontal bar)
    if (this.cardCanvas) {
      const cards = Object.keys(this.analytics.cashbackByCard);
      const cb    = Object.values(this.analytics.cashbackByCard).map(Number);
      this.charts.push(new Chart(this.cardCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: cards,
          datasets: [{
            label: 'Cashback Earned ($)',
            data: cb,
            backgroundColor: '#10b981cc',
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true } }
        }
      }));
    }
  }

  private friendly(cat: string): string {
    const map: Record<string, string> = {
      GAS_STATION: 'Gas', RESTAURANT: 'Dining', GROCERY: 'Grocery',
      COSTCO: 'Costco', PHARMACY: 'Pharmacy', ONLINE: 'Online', OTHER: 'Other'
    };
    return map[cat] || cat;
  }

  savingsRatio(): number {
    if (!this.analytics?.totalPotentialCashback) return 0;
    return Math.round((this.analytics.totalCashbackEarned / this.analytics.totalPotentialCashback) * 100);
  }

  topSuggestions(): CashbackSuggestion[] {
    return (this.analytics?.suggestions || []).slice(0, 4);
  }

  suggestionClass(annual: number): string {
    if (annual >= 100) return 'high';
    if (annual >= 30)  return '';
    return 'low';
  }
}
