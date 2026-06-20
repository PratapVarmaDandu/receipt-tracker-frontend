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
import { DataRequestComponent } from './data-request/data-request.component';
import { PackageQuestionnaireComponent } from './package-questionnaire/package-questionnaire.component';
import { FormVersionsComponent } from './form-versions/form-versions.component';

const routes: Routes = [
  { path: '',                                     component: CaseListComponent,              canActivate: [AuthGuard] },
  { path: 'employer/onboard/:token',              component: EmployerOnboardComponent,       canActivate: [AuthGuard] },
  { path: 'employer',                             component: EmployerDashboardComponent,     canActivate: [AuthGuard] },
  { path: 'attorney',                             component: AttorneyDashboardComponent,     canActivate: [AuthGuard] },
  { path: 'cases/new',                            component: CaseFormComponent,              canActivate: [AuthGuard] },
  { path: 'cases/join/:token',                    component: CaseJoinComponent },   // public
  { path: 'cases/:id',                            component: CaseDetailComponent,            canActivate: [AuthGuard] },
  { path: 'profile',                              component: CanonicalProfileComponent,      canActivate: [AuthGuard] },
  { path: 'data-request/:token',                  component: DataRequestComponent },         // public GET; auth for submit
  { path: 'packages/questionnaire/:token',        component: PackageQuestionnaireComponent }, // public GET; auth for submit
  { path: 'admin/form-versions',                  component: FormVersionsComponent,          canActivate: [AuthGuard] }
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
    EmployerOnboardComponent,
    DataRequestComponent,
    PackageQuestionnaireComponent,
    FormVersionsComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class ImmigrationModule {}
