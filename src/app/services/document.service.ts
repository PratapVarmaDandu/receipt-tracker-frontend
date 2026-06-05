import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';
import {
  DocFile, DocumentSummary, DocumentShare,
  CreateDocumentShareRequest, DocumentNextStep
} from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly source = 'DocumentService';
  private readonly api = `${environment.apiUrl}/documents`;

  constructor(private http: HttpClient, private logger: LoggerService) {}

  // ── Upload ────────────────────────────────────────────────────────────────

  upload(
    file: File,
    title: string,
    category: string,
    subcategory?: string,
    documentYear?: number,
    expiryDate?: string,
    notes?: string
  ): Observable<DocFile> {
    const startTime = Date.now();
    this.logger.info(this.source, `>>> upload(${file.name}, ${category})`);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title);
    fd.append('category', category);
    if (subcategory)   fd.append('subcategory', subcategory);
    if (documentYear)  fd.append('documentYear', String(documentYear));
    if (expiryDate)    fd.append('expiryDate', expiryDate);
    if (notes)         fd.append('notes', notes);

    return this.http.post<DocFile>(`${this.api}/upload`, fd).pipe(
      tap(d => {
        this.logger.apiCall(this.source, 'POST', '/documents/upload', startTime);
        this.logger.info(this.source, `<<< upload id=${d.id}`);
      }),
      catchError(err => {
        this.logger.apiError(this.source, 'POST', '/documents/upload', err, startTime);
        throw err;
      })
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────

  list(category?: string, page = 0, size = 50): Observable<DocFile[]> {
    const startTime = Date.now();
    let params = new HttpParams().set('page', page).set('size', size);
    if (category) params = params.set('category', category);
    return this.http.get<DocFile[]>(this.api, { params }).pipe(
      tap(docs => this.logger.debug(this.source, `list count=${docs.length}`)),
      catchError(err => {
        this.logger.apiError(this.source, 'GET', '/documents', err, startTime);
        return of([]);
      })
    );
  }

  getById(id: number): Observable<DocFile> {
    return this.http.get<DocFile>(`${this.api}/${id}`).pipe(
      catchError(err => { throw err; })
    );
  }

  getSummary(): Observable<DocumentSummary> {
    return this.http.get<DocumentSummary>(`${this.api}/summary`).pipe(
      catchError(err => {
        this.logger.apiError(this.source, 'GET', '/documents/summary', err, Date.now());
        return of({ total: 0, expiringSoon: 0, expired: 0, pendingNextSteps: 0, byCategory: {} as any });
      })
    );
  }

  getExpiring(days = 90): Observable<DocFile[]> {
    return this.http.get<DocFile[]>(`${this.api}/expiring`, {
      params: new HttpParams().set('days', days)
    }).pipe(catchError(() => of([])));
  }

  // ── Download ──────────────────────────────────────────────────────────────

  downloadUrl(id: number): string {
    return `${this.api}/${id}/download`;
  }

  downloadViaShareUrl(token: string, documentId: number): string {
    return `${this.api}/shared/${token}/download/${documentId}`;
  }

  // ── Update / archive / delete ─────────────────────────────────────────────

  update(id: number, patch: Partial<Pick<DocFile, 'title' | 'subcategory' | 'documentYear' | 'expiryDate' | 'notes'>>): Observable<DocFile> {
    return this.http.put<DocFile>(`${this.api}/${id}`, patch).pipe(
      catchError(err => { throw err; })
    );
  }

  archive(id: number): Observable<DocFile> {
    return this.http.put<DocFile>(`${this.api}/${id}/archive`, {}).pipe(
      catchError(err => { throw err; })
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`).pipe(
      catchError(err => { throw err; })
    );
  }

  // ── Next steps ────────────────────────────────────────────────────────────

  addNextStep(documentId: number, title: string, description?: string, dueDate?: string): Observable<DocumentNextStep> {
    return this.http.post<DocumentNextStep>(`${this.api}/${documentId}/steps`,
      { title, description: description ?? null, dueDate: dueDate ?? null }
    ).pipe(catchError(err => { throw err; }));
  }

  completeNextStep(stepId: number): Observable<DocumentNextStep> {
    return this.http.put<DocumentNextStep>(`${this.api}/steps/${stepId}/complete`, {}).pipe(
      catchError(err => { throw err; })
    );
  }

  deleteNextStep(stepId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/steps/${stepId}`).pipe(
      catchError(err => { throw err; })
    );
  }

  // ── Sharing ───────────────────────────────────────────────────────────────

  createShare(req: CreateDocumentShareRequest): Observable<DocumentShare> {
    return this.http.post<DocumentShare>(`${this.api}/share`, req).pipe(
      catchError(err => { throw err; })
    );
  }

  getMyShares(): Observable<DocumentShare[]> {
    return this.http.get<DocumentShare[]>(`${this.api}/shares/mine`).pipe(
      catchError(() => of([]))
    );
  }

  /** Public — no auth required */
  getByShareToken(token: string): Observable<DocumentShare> {
    return this.http.get<DocumentShare>(`${this.api}/shared/${token}`).pipe(
      catchError(err => { throw err; })
    );
  }
}
