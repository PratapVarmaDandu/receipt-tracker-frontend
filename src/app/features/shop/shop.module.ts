import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AuthGuard } from '../../guards/auth.guard';
import { ShopComponent } from '../../components/shop/shop.component';
import { CartSidebarComponent } from '../../components/cart-sidebar/cart-sidebar.component';
import { CheckoutComponent } from '../../components/checkout/checkout.component';
import { OrderConfirmationComponent } from '../../components/order-confirmation/order-confirmation.component';

const routes: Routes = [
  { path: '', component: ShopComponent, canActivate: [AuthGuard] },
  { path: 'checkout', component: CheckoutComponent, canActivate: [AuthGuard] },
  { path: 'order', component: OrderConfirmationComponent, canActivate: [AuthGuard] }
];

@NgModule({
  declarations: [ShopComponent, CartSidebarComponent, CheckoutComponent, OrderConfirmationComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class ShopModule {}
