import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { GroupListComponent } from '../../components/group-list/group-list.component';

// Exports GroupListComponent so it can be embedded as a widget in DashboardModule
// AND used as a routed page in GroupsModule without declaring it twice.
@NgModule({
  declarations: [GroupListComponent],
  imports: [SharedModule],
  exports: [GroupListComponent]
})
export class GroupsSharedModule {}
