import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { LandingComponent } from './components/landing/landing.component';
import { WelcomeBannerComponent } from './components/welcome-banner/welcome-banner.component';
import { FeatureLockedComponent } from './components/feature-locked/feature-locked.component';
import { StorageSettingsComponent } from './components/storage-settings/storage-settings.component';
import { UploadComponent } from './components/upload/upload.component';
import { ShareResponseComponent } from './components/share-response/share-response.component';
import { PlansComponent } from './components/plans/plans.component';
import { PastDueBannerComponent } from './components/past-due-banner/past-due-banner.component';
import { FeedbackWidgetComponent } from './components/feedback-widget/feedback-widget.component';

import { AuthService } from './services/auth.service';
import { CredentialsInterceptor } from './interceptors/credentials.interceptor';
import { DiagnosticLogInterceptor } from './interceptors/diagnostic-log.interceptor';

export function initAuth(authService: AuthService): () => Promise<void> {
  return () => firstValueFrom(authService.checkAuth()).then(() => {}).catch(() => {});
}

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    LandingComponent,
    WelcomeBannerComponent,
    FeatureLockedComponent,
    StorageSettingsComponent,
    UploadComponent,
    ShareResponseComponent,
    PlansComponent,
    PastDueBannerComponent,
    FeedbackWidgetComponent
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
      provide: HTTP_INTERCEPTORS,
      useClass: DiagnosticLogInterceptor,
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
