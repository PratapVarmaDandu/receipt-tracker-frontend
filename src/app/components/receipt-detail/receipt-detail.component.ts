import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Receipt, STORE_TYPE_ICONS, STORE_TYPE_LABELS, STORE_TYPE_CSS } from '../../models/receipt.model';
import { Group } from '../../models/group.model';
import { Vehicle } from '../../models/vehicle.model';
import { ReceiptService } from '../../services/receipt.service';
import { GroupService } from '../../services/group.service';
import { VehicleService } from '../../services/vehicle.service';
import { ExpenseShare } from '../../models/expense-share.model';

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
  showShareDialog = false;

  // Group assignment
  myGroups: Group[] = [];
  selectedGroupId: number | null = null;
  groupSaving = false;
  groupError = '';

  // Vehicle linking
  myVehicles: Vehicle[] = [];
  selectedVehicleId: number | null = null;
  vehicleSaving = false;
  vehicleError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private receiptService: ReceiptService,
    private groupService: GroupService,
    private vehicleService: VehicleService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.receiptService.getById(id).subscribe({
      next: (r) => {
        this.receipt = r;
        this.selectedGroupId = r.groupId ?? null;
        this.selectedVehicleId = r.vehicleId ?? null;
        this.buildForm(r);
        this.loading = false;
      },
      error: () => { this.loading = false; this.error = 'Receipt not found.'; }
    });

    this.groupService.getMyGroups().subscribe({
      next: (groups) => { this.myGroups = groups; },
      error: () => {}
    });

    this.vehicleService.list().subscribe({
      next: (vehicles) => { this.myVehicles = vehicles; },
      error: () => {}
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

  saveGroup() {
    if (!this.receipt?.id) return;
    this.groupSaving = true;
    this.groupError = '';
    this.receiptService.addToGroup(this.receipt.id, this.selectedGroupId).subscribe({
      next: (r) => {
        this.receipt = r;
        this.selectedGroupId = r.groupId ?? null;
        this.groupSaving = false;
      },
      error: (err) => {
        this.groupError = err?.error?.error ?? 'Failed to update group.';
        this.groupSaving = false;
      }
    });
  }

  get groupMembers(): string[] {
    if (!this.receipt?.groupId) return [];
    const g = this.myGroups.find(g => g.id === this.receipt!.groupId);
    return g?.members?.map(m => m.email) ?? [];
  }

  saveVehicle() {
    if (!this.receipt?.id) return;
    this.vehicleSaving = true;
    this.vehicleError = '';
    this.receiptService.linkToVehicle(this.receipt.id, this.selectedVehicleId).subscribe({
      next: (r) => {
        this.receipt = r;
        this.selectedVehicleId = r.vehicleId ?? null;
        this.vehicleSaving = false;
      },
      error: (err) => {
        this.vehicleError = err?.error?.error ?? 'Failed to link vehicle.';
        this.vehicleSaving = false;
      }
    });
  }

  cashbackGap(): number {
    return (this.receipt?.potentialCashback || 0) - (this.receipt?.cashbackEarned || 0);
  }
}
