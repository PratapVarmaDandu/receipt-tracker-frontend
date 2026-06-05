import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UploadComponent } from './components/upload/upload.component';
import { ReceiptListComponent } from './components/receipt-list/receipt-list.component';
import { ReceiptDetailComponent } from './components/receipt-detail/receipt-detail.component';
import { LoginComponent } from './components/login/login.component';
import { StorageSettingsComponent } from './components/storage-settings/storage-settings.component';
import { ShareResponseComponent } from './components/share-response/share-response.component';
import { GroupListComponent } from './components/group-list/group-list.component';
import { GroupDetailComponent } from './components/group-detail/group-detail.component';
import { JoinGroupComponent } from './components/join-group/join-group.component';
import { DocumentsComponent } from './components/documents/documents.component';
import { DocumentDetailComponent } from './components/document-detail/document-detail.component';
import { DocumentAccessComponent } from './components/document-access/document-access.component';
import { GarageComponent } from './components/garage/garage.component';
import { VehicleDetailComponent } from './components/vehicle-detail/vehicle-detail.component';
import { VehicleJoinComponent } from './components/vehicle-join/vehicle-join.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  // Public — no auth required
  { path: 'login',                     component: LoginComponent },
  { path: 'share/:token',              component: ShareResponseComponent },
  { path: 'group/join/:token',         component: JoinGroupComponent },
  { path: 'documents/shared/:token',   component: DocumentAccessComponent },
  { path: 'garage/join/:token',        component: VehicleJoinComponent },

  // Authenticated
  { path: '',              redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard',     component: DashboardComponent,       canActivate: [AuthGuard] },
  { path: 'upload',        component: UploadComponent,          canActivate: [AuthGuard] },
  { path: 'receipts',      component: ReceiptListComponent,     canActivate: [AuthGuard] },
  { path: 'receipts/:id',  component: ReceiptDetailComponent,   canActivate: [AuthGuard] },
  { path: 'settings',      component: StorageSettingsComponent, canActivate: [AuthGuard] },
  { path: 'groups',        component: GroupListComponent,       canActivate: [AuthGuard] },
  { path: 'groups/:id',    component: GroupDetailComponent,     canActivate: [AuthGuard] },
  { path: 'documents',     component: DocumentsComponent,       canActivate: [AuthGuard] },
  { path: 'documents/:id', component: DocumentDetailComponent,  canActivate: [AuthGuard] },
  { path: 'garage',        component: GarageComponent,          canActivate: [AuthGuard] },
  { path: 'garage/:id',    component: VehicleDetailComponent,   canActivate: [AuthGuard] },

  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
