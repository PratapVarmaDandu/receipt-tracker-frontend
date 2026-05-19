import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Receipt, STORE_TYPE_ICONS, STORE_TYPE_LABELS, STORE_TYPE_CSS } from '../../models/receipt.model';
import { ReceiptService } from '../../services/receipt.service';

@Component({
  selector: 'app-receipt-detail',
  templateUrl: './receipt-detail.component.html',
  styleUrls: ['./receipt-detail.component.scss']
})
export class ReceiptDetailComponent implements OnInit {
  receipt: Receipt | null = null;
  loading = true;
  editing = false;
  saving = false;
  error = '';

  form!: FormGroup;
  storeTypes = Object.entries(STORE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
  cardBanks = ['CHASE','DISCOVER','AMEX','CAPITAL_ONE','CITI','BANK_OF_AMERICA','WELLS_FARGO','OTHER'];
  cardTypes = ['VISA','MASTERCARD','AMEX','DISCOVER','DEBIT'];

  storeIcons = STORE_TYPE_ICONS;
  storeLabels = STORE_TYPE_LABELS;
  storeCss = STORE_TYPE_CSS;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private receiptService: ReceiptService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.receiptService.getById(id).subscribe({
      next: (r) => { this.receipt = r; this.buildForm(r); this.loading = false; },
      error: () => { this.loading = false; this.error = 'Receipt not found.'; }
    });
  }

  buildForm(r: Receipt) {
    this.form = this.fb.group({
      storeName:        [r.storeName, Validators.required],
      storeType:        [r.storeType, Validators.required],
      purchaseDateTime: [r.purchaseDateTime?.slice(0, 16), Validators.required],
      cardBank:         [r.cardBank || ''],
      cardType:         [r.cardType || ''],
      lastFourDigits:   [r.lastFourDigits || ''],
      subtotal:         [r.subtotal],
      tax:              [r.tax],
      tip:              [r.tip],
      total:            [r.total, Validators.required],
      items: this.fb.array(
        (r.items || []).map(i => this.fb.group({
          id:         [i.id],
          name:       [i.name, Validators.required],
          quantity:   [i.quantity || 1],
          unitPrice:  [i.unitPrice],
          totalPrice: [i.totalPrice, Validators.required]
        }))
      )
    });
  }

  get items(): FormArray { return this.form.get('items') as FormArray; }

  addItem() {
    this.items.push(this.fb.group({
      id: [null], name: ['', Validators.required], quantity: [1],
      unitPrice: [null], totalPrice: [null, Validators.required]
    }));
  }

  removeItem(i: number) { this.items.removeAt(i); }

  save() {
    if (this.form.invalid || !this.receipt?.id) return;
    this.saving = true;
    const val = this.form.value;
    if (val.lastFourDigits) {
      val.paymentCard = [val.cardBank, val.cardType, val.lastFourDigits].filter(Boolean).join('_');
    }
    this.receiptService.update(this.receipt.id, val).subscribe({
      next: (r) => { this.receipt = r; this.editing = false; this.saving = false; },
      error: () => { this.saving = false; this.error = 'Failed to save.'; }
    });
  }

  delete() {
    if (!this.receipt?.id || !confirm('Delete this receipt permanently?')) return;
    this.receiptService.delete(this.receipt.id).subscribe(() => this.router.navigate(['/receipts']));
  }

  cashbackGap(): number {
    return (this.receipt?.potentialCashback || 0) - (this.receipt?.cashbackEarned || 0);
  }
}
