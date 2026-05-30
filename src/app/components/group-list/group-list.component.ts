import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { LoggerService } from '../../services/logger.service';
import { Group } from '../../models/group.model';

@Component({
  selector: 'app-group-list',
  templateUrl: './group-list.component.html',
  styleUrls: ['./group-list.component.scss']
})
export class GroupListComponent implements OnInit {
  private readonly source = 'GroupListComponent';

  groups: Group[] = [];
  loading = false;
  showCreate = false;
  newGroupName = '';
  creating = false;
  createError: string | null = null;

  constructor(
    private groupService: GroupService,
    private logger: LoggerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.groupService.getMyGroups().subscribe(groups => {
      this.groups = groups;
      this.loading = false;
    });
  }

  create(): void {
    if (!this.newGroupName.trim()) { this.createError = 'Enter a group name.'; return; }
    this.creating = true;
    this.createError = null;
    this.groupService.createGroup(this.newGroupName.trim()).subscribe({
      next: group => {
        if (group) {
          this.groups.unshift(group);
          this.newGroupName = '';
          this.showCreate = false;
          this.router.navigate(['/groups', group.id]);
        }
        this.creating = false;
      },
      error: err => {
        this.createError = err?.error?.error ?? 'Failed to create group.';
        this.creating = false;
        this.logger.error(this.source, 'createGroup failed', err);
      }
    });
  }
}
