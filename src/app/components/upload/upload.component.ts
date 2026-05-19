import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ReceiptService } from '../../services/receipt.service';
import { Receipt, STORE_TYPE_LABELS } from '../../models/receipt.model';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss']
})
export class UploadComponent {
  mode: 'upload' | 'manual' = 'upload';
  dragging = false;
  uploading = false;
  processing = false;
  error = '';
  success = '';
  uploadedReceipt: Receipt | null = null;

  manualForm: FormGroup;
  storeTypes = Object.entries(STORE_TYPE_LABELS).map(([value, label]) => ({ value, label }));
  cardBanks = ['CHASE', 'DISCOVER', 'AMEX', 'CAPITAL_ONE', 'CITI', 'BANK_OF_AMERICA', 'WELLS_FARGO', 'OTHER'];
  cardTypes = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'DEBIT'];

  constructor(private receiptService: ReceiptService, private fb: FormBuilder, private router: Router) {
    this.manualForm = this.fb.group({
      storeName:        ['', Validators.required],
      storeType:        ['OTHER', Validators.required],
      purchaseDateTime: ['', Validators.required],
      cardBank:         [''],
      cardType:         [''],
      lastFourDigits:   ['', [Validators.minLength(4), Validators.maxLength(4), Validators.pattern(/^\d{4}$/)]],
      subtotal:         [null],
      tax:              [null],
      tip:              [null],
      total:            [null, Validators.required],
      items:            this.fb.array([])
    });
  }

  get items(): FormArray { return this.manualForm.get('items') as FormArray; }

  addItem() {
    this.items.push(this.fb.group({
      name:       ['', Validators.required],
      quantity:   [1, Validators.min(1)],
      unitPrice:  [null, Validators.min(0)],
      totalPrice: [null, [Validators.required, Validators.min(0)]]
    }));
  }

  removeItem(i: number) { this.items.removeAt(i); }

  onDragOver(e: DragEvent) { e.preventDefault(); this.dragging = true; }
  onDragLeave() { this.dragging = false; }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  onFileSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
  }

  processFile(file: File) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      this.error = 'Please upload an image (JPG, PNG, WEBP) or PDF file.';
      return;
    }
    this.uploading = true;
    this.error = '';
    this.receiptService.upload(file).subscribe({
      next: (r) => {
        this.uploading = false;
        this.uploadedReceipt = r;
        this.success = 'Receipt processed! Review and save the extracted data.';
      },
      error: (err) => {
        this.uploading = false;
        const msg = err?.error?.error || err?.message || 'Unknown error';
        this.error = `Upload failed: ${msg}. You can also use Manual Entry.`;
      }
    });
  }

  confirmUpload() {
    if (this.uploadedReceipt?.id) {
      this.router.navigate(['/receipts', this.uploadedReceipt.id]);
    }
  }

  submitManual() {
    if (this.manualForm.invalid) return;
    this.processing = true;
    const val = this.manualForm.value;
    if (val.lastFourDigits) {
      val.paymentCard = [val.cardBank, val.cardType, val.lastFourDigits].filter(Boolean).join('_');
    }
    this.receiptService.createManual(val).subscribe({
      next: (r) => {
        this.processing = false;
        this.router.navigate(['/receipts', r.id]);
      },
      error: () => {
        this.processing = false;
        this.error = 'Failed to save receipt.';
      }
    });
  }
}
