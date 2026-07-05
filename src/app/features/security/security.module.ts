import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { SecurityInfoComponent } from '../../components/security-info/security-info.component';

const routes: Routes = [
  { path: '', component: SecurityInfoComponent }  // public
];

@NgModule({
  declarations: [SecurityInfoComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class SecurityModule {}
