import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';

export type SubmissionType = 'FEEDBACK' | 'BUG_REPORT' | 'IDEA';

export interface UserSubmission {
  id: number;
  type: SubmissionType;
  message: string;
  attachmentMimeType: string | null;
  status: string;
  rewardGranted: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly source = 'FeedbackService';
  private readonly apiUrl = `${environment.apiUrl}/feedback`;

  constructor(private http: HttpClient, private logger: LoggerService) {}

  /**
   * Submit feedback / bug report / idea. Errors are NOT swallowed —
   * the widget surfaces the real backend message (size/type rejections).
   */
  submit(type: SubmissionType, message: string, file: File | null, clientLog: string): Observable<UserSubmission> {
    this.logger.trace(this.source, `>>> submit(${type})`);
    const form = new FormData();
    form.append('type', type);
    form.append('message', message);
    if (file) {
      form.append('file', file, file.name);
    }
    if (clientLog) {
      form.append('clientLog', clientLog);
    }
    return this.http.post<UserSubmission>(this.apiUrl, form);
  }
}
