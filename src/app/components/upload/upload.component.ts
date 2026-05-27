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
  docType: 'receipt' | 'bank' = 'receipt';
  dragging = false;
  uploading = false;
  processing = false;
  error = '';
  success = '';
  fileSaveNotice = '';
  fileSaveWarning = false;
  uploadedReceipt: Receipt | null = null;

  /** true on iPhone, iPad, or Android browsers */
  readonly isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  /** Toggles between camera capture and gallery picker on mobile */
  useCamera = false;

  get isBankStatement(): boolean {
    return this.uploadedReceipt?.receiptType === 'BANK_STATEMENT';
  }

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

  openFilePicker(fileInput: HTMLInputElement, camera: boolean) {
    this.useCamera = camera;
    // Set capture attribute dynamically before triggering click
    if (camera) {
      fileInput.setAttribute('capture', 'environment');
    } else {
      fileInput.removeAttribute('capture');
    }
    fileInput.click();
  }

  processFile(file: File) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'pdf'];
    if (!allowed.includes(file.type) && !allowedExts.includes(ext)) {
      this.error = 'Please upload an image (JPG, PNG, WEBP, HEIC) or PDF file.';
      return;
    }
    this.uploading = true;
    this.error = '';
    this.fileSaveNotice = '';
    this.fileSaveWarning = false;
    this.receiptService.upload(file).subscribe({
      next: (r) => {
        this.uploading = false;
        this.uploadedReceipt = r;
        this.success = r.receiptType === 'BANK_STATEMENT'
          ? 'Bank statement processed! Review and confirm the transactions.'
          : 'Receipt processed! Review and save the extracted data.';
        this.applyFileSaveNotice(r);
      },
      error: (err) => {
        this.uploading = false;
        const msg = err?.error?.error || err?.message || 'Unknown error';
        this.error = `Upload failed: ${msg}. You can also use Manual Entry.`;
      }
    });
  }

  private applyFileSaveNotice(r: Receipt) {
    switch (r.fileSaveStatus) {
      case 'SAVED':
        this.fileSaveWarning = false;
        this.fileSaveNotice = this.isMobile
          ? 'File saved to your configured storage.'
          : `File saved to: ${r.fileSavedTo}`;
        break;
      case 'DEFAULT':
        this.fileSaveWarning = false;
        this.fileSaveNotice = this.isMobile
          ? 'File stored in the default server folder.'
          : `File stored in default folder: ${r.fileSavedTo}`;
        break;
      case 'FAILED':
        this.fileSaveWarning = true;
        this.fileSaveNotice = 'File could not be saved to storage — receipt data was still processed.';
        break;
      default:
        break;
    }
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
