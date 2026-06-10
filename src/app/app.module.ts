import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UploadComponent } from './components/upload/upload.component';
import { ReceiptListComponent } from './components/receipt-list/receipt-list.component';
import { ReceiptDetailComponent } from './components/receipt-detail/receipt-detail.component';
import { LoginComponent } from './components/login/login.component';

import { AuthService } from './services/auth.service';
import { CredentialsInterceptor } from './interceptors/credentials.interceptor';
import { StorageSettingsComponent } from './components/storage-settings/storage-settings.component';
import { WelcomeBannerComponent } from './components/welcome-banner/welcome-banner.component';
import { ShareDialogComponent } from './components/share-dialog/share-dialog.component';
import { ShareManagerComponent } from './components/share-manager/share-manager.component';
import { ShareResponseComponent } from './components/share-response/share-response.component';
import { GroupListComponent } from './components/group-list/group-list.component';
import { GroupDetailComponent } from './components/group-detail/group-detail.component';
import { JoinGroupComponent } from './components/join-group/join-group.component';
import { DocumentsComponent } from './components/documents/documents.component';
import { DocumentDetailComponent } from './components/document-detail/document-detail.component';
import { DocumentShareDialogComponent } from './components/document-share-dialog/document-share-dialog.component';
import { DocumentAccessComponent } from './components/document-access/document-access.component';
import { GarageComponent } from './components/garage/garage.component';
import { VehicleDetailComponent } from './components/vehicle-detail/vehicle-detail.component';
import { VehicleJoinComponent } from './components/vehicle-join/vehicle-join.component';
import { JobTrackerComponent } from './components/job-tracker/job-tracker.component';
import { JobDetailComponent } from './components/job-detail/job-detail.component';
import { ShopComponent } from './components/shop/shop.component';
import { CartSidebarComponent } from './components/cart-sidebar/cart-sidebar.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { OrderConfirmationComponent } from './components/order-confirmation/order-confirmation.component';

export function initAuth(authService: AuthService): () => Promise<void> {
  return () => firstValueFrom(authService.checkAuth()).then(() => {}).catch(() => {});
}

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    UploadComponent,
    ReceiptListComponent,
    ReceiptDetailComponent,
    LoginComponent,
    StorageSettingsComponent,
    WelcomeBannerComponent,
    ShareDialogComponent,
    ShareManagerComponent,
    ShareResponseComponent,
    GroupListComponent,
    GroupDetailComponent,
    JoinGroupComponent,
    DocumentsComponent,
    DocumentDetailComponent,
    DocumentShareDialogComponent,
    DocumentAccessComponent,
    GarageComponent,
    VehicleDetailComponent,
    VehicleJoinComponent,
    JobTrackerComponent,
    JobDetailComponent,
    ShopComponent,
    CartSidebarComponent,
    CheckoutComponent,
    OrderConfirmationComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    AppRoutingModule
  ],
  providers: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CredentialsInterceptor,
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [AuthService],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
