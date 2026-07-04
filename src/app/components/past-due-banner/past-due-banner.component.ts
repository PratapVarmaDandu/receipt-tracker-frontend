import { Component, OnInit } from '@angular/core';
import { SubscriptionService, MySubscription } from '../../services/subscription.service';
import { AuthService } from '../../services/auth.service';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-past-due-banner',
  templateUrl: './past-due-banner.component.html',
  styleUrls: ['./past-due-banner.component.scss']
})
export class PastDueBannerComponent implements OnInit {
  private readonly source = 'PastDueBannerComponent';

  pastDueSubscriptions: MySubscription[] = [];
  dismissed = false;

  constructor(
    private subscriptionService: SubscriptionService,
    private authService: AuthService,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser().subscribe(user => {
      if (!user) {
        this.pastDueSubscriptions = [];
        return;
      }
      this.subscriptionService.getMine().subscribe(subs => {
        this.pastDueSubscriptions = subs.filter(s => s.status === 'PAST_DUE');
        if (this.pastDueSubscriptions.length > 0) {
          this.logger.info(this.source, `${this.pastDueSubscriptions.length} subscription(s) past due`);
        }
      });
    });
  }

  get earliestGraceDeadline(): string | null {
    const deadlines = this.pastDueSubscriptions
      .map(s => s.gracePeriodEndsAt)
      .filter((d): d is string => !!d)
      .sort();
    return deadlines.length > 0 ? deadlines[0] : null;
  }

  dismiss(): void {
    this.dismissed = true;
  }
}
