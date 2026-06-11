import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OrganizationService } from '../../services/organization.service';
import { LoggerService } from '../../services/logger.service';
import { Organization } from '../../models/organization.model';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  private readonly source = 'AdminComponent';
  orgs: Organization[] = [];
  loading = true;

  constructor(
    private orgService: OrganizationService,
    private router: Router,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.orgService.listMine().subscribe(orgs => {
      this.orgs = orgs;
      this.loading = false;
    });
  }

  goTo(slug: string): void {
    this.router.navigate(['/admin/org', slug]);
  }

  register(): void {
    this.router.navigate(['/admin/register']);
  }
}
