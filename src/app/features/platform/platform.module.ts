import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AuthGuard } from '../../guards/auth.guard';
import { PlatformComponent } from '../../components/platform/platform.component';
import { PlatformSquareConfigComponent } from '../../components/platform-square-config/platform-square-config.component';

const routes: Routes = [
  { path: '', component: PlatformComponent, canActivate: [AuthGuard] },
  { path: 'square-config', component: PlatformSquareConfigComponent, canActivate: [AuthGuard] }
];

@NgModule({
  declarations: [PlatformComponent, PlatformSquareConfigComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class PlatformModule {}
