import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AuthGuard } from '../../guards/auth.guard';
import { FeatureGuard } from '../../guards/feature.guard';
import { GarageComponent } from '../../components/garage/garage.component';
import { VehicleDetailComponent } from '../../components/vehicle-detail/vehicle-detail.component';
import { VehicleJoinComponent } from '../../components/vehicle-join/vehicle-join.component';

const routes: Routes = [
  { path: '', component: GarageComponent, canActivate: [AuthGuard, FeatureGuard], data: { feature: 'GARAGE' } },
  { path: 'join/:token', component: VehicleJoinComponent },  // public — must be before :id
  { path: ':id', component: VehicleDetailComponent, canActivate: [AuthGuard, FeatureGuard], data: { feature: 'GARAGE' } }
];

@NgModule({
  declarations: [GarageComponent, VehicleDetailComponent, VehicleJoinComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class GarageModule {}
