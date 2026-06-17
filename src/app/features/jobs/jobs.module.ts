import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AuthGuard } from '../../guards/auth.guard';
import { FeatureGuard } from '../../guards/feature.guard';
import { JobTrackerComponent } from '../../components/job-tracker/job-tracker.component';
import { JobDetailComponent } from '../../components/job-detail/job-detail.component';

const routes: Routes = [
  { path: '', component: JobTrackerComponent, canActivate: [AuthGuard, FeatureGuard], data: { feature: 'JOB_TRACKER' } },
  { path: ':id', component: JobDetailComponent, canActivate: [AuthGuard, FeatureGuard], data: { feature: 'JOB_TRACKER' } }
];

@NgModule({
  declarations: [JobTrackerComponent, JobDetailComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class JobsModule {}
