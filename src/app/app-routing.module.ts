import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LandingComponent } from './components/landing/landing.component';
import { WelcomeBannerComponent } from './components/welcome-banner/welcome-banner.component';
import { FeatureLockedComponent } from './components/feature-locked/feature-locked.component';
import { StorageSettingsComponent } from './components/storage-settings/storage-settings.component';
import { UploadComponent } from './components/upload/upload.component';
import { ShareResponseComponent } from './components/share-response/share-response.component';
import { PlansComponent } from './components/plans/plans.component';
import { AuthGuard } from './guards/auth.guard';
import { environment } from '../environments/environment';

const routes: Routes = [
  // ── Eager shell routes (declared in AppModule) ──────────────────────────
  { path: 'login',            component: LoginComponent },
  { path: 'share/:token',     component: ShareResponseComponent },          // public
  { path: 'locked/:feature',  component: FeatureLockedComponent, canActivate: [AuthGuard] },
  { path: 'settings',         component: StorageSettingsComponent, canActivate: [AuthGuard] },
  { path: 'upload',           component: UploadComponent,          canActivate: [AuthGuard] },
  { path: 'plans',            component: PlansComponent,           canActivate: [AuthGuard] },

  // ── Public marketing page (root) ─────────────────────────────────────────
  { path: '', component: LandingComponent, pathMatch: 'full' },

  // ── Dev-only preview: always shows the landing page, even when the local
  //    `environment.localDev` auth mock would otherwise redirect to /dashboard ──
  ...(environment.production ? [] : [
    { path: 'welcome-preview', component: LandingComponent, data: { preview: true } }
  ]),

  // ── Lazy feature modules ─────────────────────────────────────────────────
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  {
    path: 'receipts',
    loadChildren: () => import('./features/receipts/receipts.module').then(m => m.ReceiptsModule)
  },
  {
    // /groups  and  /groups/:id
    path: 'groups',
    loadChildren: () => import('./features/groups/groups.module').then(m => m.GroupsModule)
  },
  {
    // /group/join/:token  (public join link uses singular "group" prefix)
    path: 'group',
    loadChildren: () => import('./features/groups/groups.module').then(m => m.GroupsModule)
  },
  {
    path: 'documents',
    loadChildren: () => import('./features/documents/documents.module').then(m => m.DocumentsModule)
  },
  {
    path: 'garage',
    loadChildren: () => import('./features/garage/garage.module').then(m => m.GarageModule)
  },
  {
    path: 'jobs',
    loadChildren: () => import('./features/jobs/jobs.module').then(m => m.JobsModule)
  },
  {
    path: 'shop',
    loadChildren: () => import('./features/shop/shop.module').then(m => m.ShopModule)
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule)
  },
  {
    path: 'platform',
    loadChildren: () => import('./features/platform/platform.module').then(m => m.PlatformModule)
  },
  {
    path: 'immigration',
    loadChildren: () => import('./features/immigration/immigration.module').then(m => m.ImmigrationModule)
  },
  {
    path: 'security',      // public — data/security transparency page
    loadChildren: () => import('./features/security/security.module').then(m => m.SecurityModule)
  },

  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
