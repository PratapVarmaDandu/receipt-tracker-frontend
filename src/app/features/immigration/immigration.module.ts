import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AuthGuard } from '../../guards/auth.guard';
import { CaseListComponent } from './case-list/case-list.component';
import { CaseDetailComponent } from './case-detail/case-detail.component';
import { CaseFormComponent } from './case-form/case-form.component';
import { CanonicalProfileComponent } from './canonical-profile/canonical-profile.component';
import { CaseJoinComponent } from './case-join/case-join.component';
import { EmployerDashboardComponent } from './employer-dashboard/employer-dashboard.component';
import { AttorneyDashboardComponent } from './attorney-dashboard/attorney-dashboard.component';
import { EmployerOnboardComponent } from './employer-onboard/employer-onboard.component';

const routes: Routes = [
  { path: '',                        component: CaseListComponent,           canActivate: [AuthGuard] },
  { path: 'employer/onboard/:token', component: EmployerOnboardComponent,    canActivate: [AuthGuard] },
  { path: 'employer',                component: EmployerDashboardComponent,  canActivate: [AuthGuard] },
  { path: 'attorney',                component: AttorneyDashboardComponent,  canActivate: [AuthGuard] },
  { path: 'cases/new',               component: CaseFormComponent,           canActivate: [AuthGuard] },
  { path: 'cases/join/:token',       component: CaseJoinComponent },  // public
  { path: 'cases/:id',               component: CaseDetailComponent,        canActivate: [AuthGuard] },
  { path: 'profile',                 component: CanonicalProfileComponent,  canActivate: [AuthGuard] }
];

@NgModule({
  declarations: [
    CaseListComponent,
    CaseDetailComponent,
    CaseFormComponent,
    CanonicalProfileComponent,
    CaseJoinComponent,
    EmployerDashboardComponent,
    AttorneyDashboardComponent,
    EmployerOnboardComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class ImmigrationModule {}
