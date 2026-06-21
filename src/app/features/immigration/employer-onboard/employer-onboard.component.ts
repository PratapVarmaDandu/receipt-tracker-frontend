import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ImmOrgService } from '../../../services/imm-org.service';
import { PartnershipJoinInfo, EmployerOnboardRequest } from '../../../models/imm-org.model';

@Component({
  selector: 'app-employer-onboard',
  templateUrl: './employer-onboard.component.html',
  styleUrls: ['./employer-onboard.component.scss']
})
export class EmployerOnboardComponent implements OnInit {
  token = '';
  joinInfo: PartnershipJoinInfo | null = null;

  loading = true;
  loadError: string | null = null;

  submitting = false;
  submitError: string | null = null;
  done = false;
  submitted = false;

  form: EmployerOnboardRequest = {
    orgName: '',
    contactName: '',
    contactEmail: '',
    address: '',
    city: '',
    stateCode: '',
    zipCode: '',
    einNumber: '',
    website: ''
  };

  readonly US_STATES = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
    'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
    'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
    'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private immOrgService: ImmOrgService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.loadError = 'Invalid invite link.';
      this.loading = false;
      return;
    }
    this.immOrgService.getOnboardInfo(this.token).subscribe({
      next: info => {
        this.joinInfo = info;
        this.form.contactEmail = info.inviteEmail;
        this.loading = false;
        if (info.status === 'ACTIVE') {
          this.done = true;
        }
      },
      error: err => {
        this.loadError = err?.error?.error || 'Invalid or expired invite link.';
        this.loading = false;
      }
    });
  }

  get isValid(): boolean {
    return !!(
      this.form.orgName.trim() &&
      this.form.contactName.trim() &&
      this.form.contactEmail.trim() &&
      this.form.address.trim() &&
      this.form.city.trim() &&
      this.form.stateCode &&
      this.form.zipCode.trim()
    );
  }

  submit(): void {
    this.submitted = true;
    if (!this.isValid || this.submitting) return;
    this.submitting = true;
    this.submitError = null;
    this.immOrgService.completeOnboarding(this.token, this.form).subscribe({
      next: () => {
        this.submitting = false;
        this.done = true;
      },
      error: err => {
        this.submitting = false;
        this.submitError = err?.error?.error || 'Failed to complete onboarding. Please try again.';
      }
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/immigration/employer']);
  }
}
