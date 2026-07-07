import { Injectable } from '@angular/core';

const STORAGE_KEY = 'jobTrackerNavContext';

/**
 * Remembers the ordered list of job application ids the user was last browsing
 * (kanban board or filtered/sorted table) so job-detail can step prev/next
 * without returning to the list page. Backed by sessionStorage so a page
 * refresh on the detail view doesn't lose the context.
 */
@Injectable({ providedIn: 'root' })
export class JobNavigationService {
  private ids: number[] = this.loadFromStorage();

  setContext(ids: number[]): void {
    this.ids = ids;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }

  getContext(): number[] {
    return this.ids;
  }

  private loadFromStorage(): number[] {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
