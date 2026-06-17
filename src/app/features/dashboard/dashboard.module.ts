import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { GroupsSharedModule } from '../groups/groups-shared.module';
import { AuthGuard } from '../../guards/auth.guard';
import { DashboardComponent } from '../../components/dashboard/dashboard.component';

const routes: Routes = [
  { path: '', component: DashboardComponent, canActivate: [AuthGuard] }
];

@NgModule({
  declarations: [DashboardComponent],
  imports: [SharedModule, GroupsSharedModule, RouterModule.forChild(routes)]
})
export class DashboardModule {}
