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
    WelcomeBannerComponent
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
