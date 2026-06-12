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
import { JobTrackerComponent } from './components/job-tracker/job-tracker.component';
import { JobDetailComponent } from './components/job-detail/job-detail.component';
import { ShopComponent } from './components/shop/shop.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { OrderConfirmationComponent } from './components/order-confirmation/order-confirmation.component';
import { AdminComponent } from './components/admin/admin.component';
import { AdminRegisterComponent } from './components/admin-register/admin-register.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { AdminMembersComponent } from './components/admin-members/admin-members.component';
import { AdminJoinComponent } from './components/admin-join/admin-join.component';
import { AdminSquareComponent } from './components/admin-square/admin-square.component';
import { AdminCloverComponent } from './components/admin-clover/admin-clover.component';
import { AdminOrdersComponent } from './components/admin-orders/admin-orders.component';
import { PlatformComponent } from './components/platform/platform.component';
import { FeatureLockedComponent } from './components/feature-locked/feature-locked.component';
import { AuthGuard } from './guards/auth.guard';
import { FeatureGuard } from './guards/feature.guard';

const routes: Routes = [
  // Public — no auth required
  { path: 'login',                     component: LoginComponent },
  { path: 'share/:token',              component: ShareResponseComponent },
  { path: 'group/join/:token',         component: JoinGroupComponent },
  { path: 'documents/shared/:token',   component: DocumentAccessComponent },
  { path: 'garage/join/:token',        component: VehicleJoinComponent },
  { path: 'admin/join/:token',         component: AdminJoinComponent },

  // Authenticated
  { path: '',              redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard',     component: DashboardComponent,       canActivate: [AuthGuard] },
  { path: 'upload',        component: UploadComponent,          canActivate: [AuthGuard] },
  { path: 'receipts',      component: ReceiptListComponent,     canActivate: [AuthGuard] },
  { path: 'receipts/:id',  component: ReceiptDetailComponent,   canActivate: [AuthGuard] },
  { path: 'settings',      component: StorageSettingsComponent, canActivate: [AuthGuard] },
  { path: 'groups',        component: GroupListComponent,       canActivate: [AuthGuard] },
  { path: 'groups/:id',    component: GroupDetailComponent,     canActivate: [AuthGuard] },
  { path: 'documents',     component: DocumentsComponent,       canActivate: [AuthGuard, FeatureGuard], data: { feature: 'DOCUMENT_VAULT' } },
  { path: 'documents/:id', component: DocumentDetailComponent,  canActivate: [AuthGuard, FeatureGuard], data: { feature: 'DOCUMENT_VAULT' } },
  { path: 'garage',        component: GarageComponent,          canActivate: [AuthGuard, FeatureGuard], data: { feature: 'GARAGE' } },
  { path: 'garage/:id',    component: VehicleDetailComponent,   canActivate: [AuthGuard, FeatureGuard], data: { feature: 'GARAGE' } },
  { path: 'jobs',          component: JobTrackerComponent,      canActivate: [AuthGuard, FeatureGuard], data: { feature: 'JOB_TRACKER' } },
  { path: 'jobs/:id',      component: JobDetailComponent,       canActivate: [AuthGuard, FeatureGuard], data: { feature: 'JOB_TRACKER' } },
  { path: 'shop',          component: ShopComponent,            canActivate: [AuthGuard, FeatureGuard], data: { feature: 'SHOP_POS' } },
  { path: 'shop/checkout', component: CheckoutComponent,        canActivate: [AuthGuard, FeatureGuard], data: { feature: 'SHOP_POS' } },
  { path: 'shop/order',    component: OrderConfirmationComponent, canActivate: [AuthGuard, FeatureGuard], data: { feature: 'SHOP_POS' } },
  { path: 'locked/:feature', component: FeatureLockedComponent,  canActivate: [AuthGuard] },
  { path: 'admin',                         component: AdminComponent,         canActivate: [AuthGuard] },
  { path: 'admin/register',               component: AdminRegisterComponent, canActivate: [AuthGuard] },
  { path: 'admin/org/:slug',              component: AdminDashboardComponent, canActivate: [AuthGuard] },
  { path: 'admin/org/:slug/members',      component: AdminMembersComponent,   canActivate: [AuthGuard] },
  { path: 'admin/org/:slug/square',       component: AdminSquareComponent,    canActivate: [AuthGuard] },
  { path: 'admin/org/:slug/clover',       component: AdminCloverComponent,    canActivate: [AuthGuard] },
  { path: 'admin/org/:slug/orders',       component: AdminOrdersComponent,    canActivate: [AuthGuard] },
  { path: 'platform',                     component: PlatformComponent,       canActivate: [AuthGuard] },

  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
