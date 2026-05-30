import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { AuthService } from '../../services/auth.service';
import { LoggerService } from '../../services/logger.service';
import { Group } from '../../models/group.model';
import { User } from '../../models/user.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-join-group',
  templateUrl: './join-group.component.html',
  styleUrls: ['./join-group.component.scss']
})
export class JoinGroupComponent implements OnInit {
  private readonly source = 'JoinGroupComponent';

  token = '';
  group: Group | null = null;
  currentUser: User | null = null;
  loading = true;
  notFound = false;
  joining = false;
  joined = false;
  alreadyMember = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private groupService: GroupService,
    private authService: AuthService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.authService.currentUser().subscribe(user => { this.currentUser = user; });

    this.groupService.getGroupByToken(this.token).subscribe(group => {
      if (!group) { this.notFound = true; }
      else { this.group = group; }
      this.loading = false;
    });
  }

  onLoginClick(): void {
    localStorage.setItem('postLoginRedirect', `/group/join/${this.token}`);
    window.location.href = `${environment.backendUrl}/oauth2/authorization/google`;
  }

  join(): void {
    this.joining = true;
    this.error = null;
    this.groupService.joinGroup(this.token).subscribe({
      next: group => {
        this.group = group;
        this.joined = true;
        this.joining = false;
        setTimeout(() => this.router.navigate(['/groups', group?.id]), 1500);
      },
      error: err => {
        this.error = err?.error?.error ?? 'Failed to join group.';
        this.joining = false;
        this.logger.error(this.source, 'joinGroup failed', err);
      }
    });
  }
}
