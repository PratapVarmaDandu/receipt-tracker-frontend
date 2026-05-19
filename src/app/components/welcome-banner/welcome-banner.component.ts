import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-welcome-banner',
  templateUrl: './welcome-banner.component.html',
  styleUrls: ['./welcome-banner.component.scss']
})
export class WelcomeBannerComponent {
  @Output() closed = new EventEmitter<void>();

  dismissChecked = false;

  constructor(private authService: AuthService, private router: Router) {}

  close(): void {
    if (this.dismissChecked) {
      this.authService.dismissWelcome().subscribe();
    }
    this.closed.emit();
  }

  goToSettings(): void {
    if (this.dismissChecked) {
      this.authService.dismissWelcome().subscribe();
    }
    this.closed.emit();
    this.router.navigate(['/settings']);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('wb-backdrop')) {
      this.close();
    }
  }
}
