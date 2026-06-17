import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AuthGuard } from '../../guards/auth.guard';
import { AdminComponent } from '../../components/admin/admin.component';
import { AdminRegisterComponent } from '../../components/admin-register/admin-register.component';
import { AdminDashboardComponent } from '../../components/admin-dashboard/admin-dashboard.component';
import { AdminMembersComponent } from '../../components/admin-members/admin-members.component';
import { AdminJoinComponent } from '../../components/admin-join/admin-join.component';
import { AdminSquareComponent } from '../../components/admin-square/admin-square.component';
import { AdminCloverComponent } from '../../components/admin-clover/admin-clover.component';
import { AdminOrdersComponent } from '../../components/admin-orders/admin-orders.component';

const routes: Routes = [
  { path: '', component: AdminComponent, canActivate: [AuthGuard] },
  { path: 'register', component: AdminRegisterComponent, canActivate: [AuthGuard] },
  { path: 'join/:token', component: AdminJoinComponent },  // public
  { path: 'org/:slug', component: AdminDashboardComponent, canActivate: [AuthGuard] },
  { path: 'org/:slug/members', component: AdminMembersComponent, canActivate: [AuthGuard] },
  { path: 'org/:slug/square', component: AdminSquareComponent, canActivate: [AuthGuard] },
  { path: 'org/:slug/clover', component: AdminCloverComponent, canActivate: [AuthGuard] },
  { path: 'org/:slug/orders', component: AdminOrdersComponent, canActivate: [AuthGuard] }
];

@NgModule({
  declarations: [
    AdminComponent,
    AdminRegisterComponent,
    AdminDashboardComponent,
    AdminMembersComponent,
    AdminJoinComponent,
    AdminSquareComponent,
    AdminCloverComponent,
    AdminOrdersComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class AdminModule {}
