import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AuthGuard } from '../../guards/auth.guard';
import { ReceiptListComponent } from '../../components/receipt-list/receipt-list.component';
import { ReceiptDetailComponent } from '../../components/receipt-detail/receipt-detail.component';
import { ShareDialogComponent } from '../../components/share-dialog/share-dialog.component';
import { ShareManagerComponent } from '../../components/share-manager/share-manager.component';

const routes: Routes = [
  { path: '', component: ReceiptListComponent, canActivate: [AuthGuard] },
  { path: ':id', component: ReceiptDetailComponent, canActivate: [AuthGuard] }
];

@NgModule({
  declarations: [
    ReceiptListComponent,
    ReceiptDetailComponent,
    ShareDialogComponent,
    ShareManagerComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class ReceiptsModule {}
