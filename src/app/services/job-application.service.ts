import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';
import {
  JobApplication, JobApplicationSummary, InterviewRound
} from '../models/job-application.model';

export interface CreateJobApplicationRequest {
  companyName: string;
  jobTitle: string;
  jobUrl?: string;
  location?: string;
  salaryRange?: string;
  status?: string;
  appliedDate?: string;
  followUpDate?: string;
  hrName?: string;
  hrEmail?: string;
  hrPhone?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  jobDescription?: string;
  prepNotes?: string;
  notes?: string;
  resumeDocumentId?: number | null;
  resumeVersion?: string;
}

export interface CreateInterviewRoundRequest {
  roundName: string;
  scheduledAt?: string | null;
  format?: string;
  interviewerName?: string;
  outcome?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class JobApplicationService {
  private readonly source = 'JobApplicationService';
  private readonly api = `${environment.apiUrl}/jobs`;

  constructor(private http: HttpClient, private logger: LoggerService) {}

  list(status?: string): Observable<JobApplication[]> {
    const startTime = Date.now();
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<JobApplication[]>(this.api, { params }).pipe(
      tap(r => this.logger.apiCall(this.source, 'GET', '/jobs', startTime)),
      catchError(err => { this.logger.apiError(this.source, 'GET', '/jobs', err, startTime); throw err; })
    );
  }

  getSummary(): Observable<JobApplicationSummary> {
    const startTime = Date.now();
    return this.http.get<JobApplicationSummary>(`${this.api}/summary`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', '/jobs/summary', startTime)),
      catchError(err => { this.logger.apiError(this.source, 'GET', '/jobs/summary', err, startTime); throw err; })
    );
  }

  getById(id: number): Observable<JobApplication> {
    const startTime = Date.now();
    return this.http.get<JobApplication>(`${this.api}/${id}`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/jobs/${id}`, startTime)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/jobs/${id}`, err, startTime); throw err; })
    );
  }

  create(req: CreateJobApplicationRequest): Observable<JobApplication> {
    const startTime = Date.now();
    return this.http.post<JobApplication>(this.api, req).pipe(
      tap(r => this.logger.apiCall(this.source, 'POST', '/jobs', startTime)),
      catchError(err => { this.logger.apiError(this.source, 'POST', '/jobs', err, startTime); throw err; })
    );
  }

  update(id: number, req: CreateJobApplicationRequest): Observable<JobApplication> {
    const startTime = Date.now();
    return this.http.put<JobApplication>(`${this.api}/${id}`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'PUT', `/jobs/${id}`, startTime)),
      catchError(err => { this.logger.apiError(this.source, 'PUT', `/jobs/${id}`, err, startTime); throw err; })
    );
  }

  delete(id: number): Observable<void> {
    const startTime = Date.now();
    return this.http.delete<void>(`${this.api}/${id}`).pipe(
      tap(() => this.logger.apiCall(this.source, 'DELETE', `/jobs/${id}`, startTime)),
      catchError(err => { this.logger.apiError(this.source, 'DELETE', `/jobs/${id}`, err, startTime); throw err; })
    );
  }

  addInterviewRound(jobId: number, req: CreateInterviewRoundRequest): Observable<InterviewRound> {
    const startTime = Date.now();
    return this.http.post<InterviewRound>(`${this.api}/${jobId}/interviews`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'POST', `/jobs/${jobId}/interviews`, startTime)),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/jobs/${jobId}/interviews`, err, startTime); throw err; })
    );
  }

  updateInterviewRound(jobId: number, roundId: number, req: CreateInterviewRoundRequest): Observable<InterviewRound> {
    const startTime = Date.now();
    return this.http.put<InterviewRound>(`${this.api}/${jobId}/interviews/${roundId}`, req).pipe(
      tap(() => this.logger.apiCall(this.source, 'PUT', `/jobs/${jobId}/interviews/${roundId}`, startTime)),
      catchError(err => { this.logger.apiError(this.source, 'PUT', `/jobs/${jobId}/interviews/${roundId}`, err, startTime); throw err; })
    );
  }

  deleteInterviewRound(jobId: number, roundId: number): Observable<void> {
    const startTime = Date.now();
    return this.http.delete<void>(`${this.api}/${jobId}/interviews/${roundId}`).pipe(
      tap(() => this.logger.apiCall(this.source, 'DELETE', `/jobs/${jobId}/interviews/${roundId}`, startTime)),
      catchError(err => { this.logger.apiError(this.source, 'DELETE', `/jobs/${jobId}/interviews/${roundId}`, err, startTime); throw err; })
    );
  }
}
