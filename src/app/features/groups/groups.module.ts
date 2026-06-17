import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { GroupsSharedModule } from './groups-shared.module';
import { AuthGuard } from '../../guards/auth.guard';
import { GroupDetailComponent } from '../../components/group-detail/group-detail.component';
import { JoinGroupComponent } from '../../components/join-group/join-group.component';
import { GroupListComponent } from '../../components/group-list/group-list.component';

const routes: Routes = [
  { path: '', component: GroupListComponent, canActivate: [AuthGuard] },
  { path: 'join/:token', component: JoinGroupComponent },  // public — must be before :id
  { path: ':id', component: GroupDetailComponent, canActivate: [AuthGuard] }
];

@NgModule({
  declarations: [GroupDetailComponent, JoinGroupComponent],
  imports: [SharedModule, GroupsSharedModule, RouterModule.forChild(routes)]
})
export class GroupsModule {}
