import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VehicleAccess } from '../../models/vehicle.model';
import { VehicleService } from '../../services/vehicle.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-vehicle-join',
  templateUrl: './vehicle-join.component.html',
  styleUrls: ['./vehicle-join.component.scss']
})
export class VehicleJoinComponent implements OnInit {
  token = '';
  invite: VehicleAccess | null = null;
  currentUser: User | null = null;
  loading = true;
  notFound = false;
  accepting = false;
  accepted = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vehicleService: VehicleService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.authService.currentUser().subscribe(user => { this.currentUser = user; });

    this.vehicleService.getInviteByToken(this.token).subscribe({
      next: invite => { this.invite = invite; this.loading = false; },
      error: () => { this.notFound = true; this.loading = false; }
    });
  }

  onLoginClick(): void {
    localStorage.setItem('postLoginRedirect', `/garage/join/${this.token}`);
    window.location.href = `${environment.backendUrl}/oauth2/authorization/google`;
  }

  accept(): void {
    if (!this.currentUser) { this.onLoginClick(); return; }
    this.accepting = true;
    this.error = null;
    this.vehicleService.acceptInvite(this.token).subscribe({
      next: () => {
        this.accepted = true;
        this.accepting = false;
        setTimeout(() => this.router.navigate(['/garage']), 1800);
      },
      error: err => {
        this.error = err?.error?.error ?? 'Failed to accept invite. Please try again.';
        this.accepting = false;
      }
    });
  }
}
