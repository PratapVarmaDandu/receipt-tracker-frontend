import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface LockedFeatureInfo {
  label: string;
  icon: string;
  blurb: string;
}

const FEATURE_INFO: { [key: string]: LockedFeatureInfo } = {
  EXPENSE_SHARING: {
    label: 'Expense Sharing',
    icon: 'bi-people',
    blurb: 'Split receipts with your team by amount or line item, with email invites and approval flows.'
  },
  DOCUMENT_VAULT: {
    label: 'Document Vault',
    icon: 'bi-folder-symlink',
    blurb: 'Secure storage for tax documents, resumes, income records and immigration paperwork with expiry tracking.'
  },
  GARAGE: {
    label: 'My Garage',
    icon: 'bi-speedometer2',
    blurb: 'Track vehicle maintenance, fuel economy, safety recalls and generate sale-ready history reports.'
  },
  JOB_TRACKER: {
    label: 'Job Tracker',
    icon: 'bi-briefcase',
    blurb: 'Manage job applications, interview rounds and follow-ups on a kanban board.'
  },
  SHOP_POS: {
    label: 'Shop',
    icon: 'bi-shop',
    blurb: 'Browse your organization’s Square and Clover catalogs and place orders in-app.'
  }
};

@Component({
  selector: 'app-feature-locked',
  templateUrl: './feature-locked.component.html',
  styleUrls: ['./feature-locked.component.scss']
})
export class FeatureLockedComponent implements OnInit {
  info: LockedFeatureInfo = { label: 'This module', icon: 'bi-lock', blurb: '' };

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const feature = (params.get('feature') || '').toUpperCase();
      this.info = FEATURE_INFO[feature]
        || { label: 'This module', icon: 'bi-lock', blurb: '' };
    });
  }
}
