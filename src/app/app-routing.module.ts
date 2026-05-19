import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UploadComponent } from './components/upload/upload.component';
import { ReceiptListComponent } from './components/receipt-list/receipt-list.component';
import { ReceiptDetailComponent } from './components/receipt-detail/receipt-detail.component';
import { LoginComponent } from './components/login/login.component';
import { StorageSettingsComponent } from './components/storage-settings/storage-settings.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'login',        component: LoginComponent },
  { path: '',             redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard',    component: DashboardComponent,    canActivate: [AuthGuard] },
  { path: 'upload',       component: UploadComponent,       canActivate: [AuthGuard] },
  { path: 'receipts',     component: ReceiptListComponent,  canActivate: [AuthGuard] },
  { path: 'receipts/:id', component: ReceiptDetailComponent, canActivate: [AuthGuard] },
  { path: 'settings',     component: StorageSettingsComponent, canActivate: [AuthGuard] },
  { path: '**',           redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
