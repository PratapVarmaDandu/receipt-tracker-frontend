import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';
import { Group } from '../models/group.model';

@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly source = 'GroupService';
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient, private logger: LoggerService) {}

  createGroup(name: string): Observable<Group | null> {
    const startTime = Date.now();
    this.logger.trace(this.source, `>>> createGroup(${name})`);
    return this.http.post<Group>(`${this.api}/groups`, { name }).pipe(
      tap(g => { this.logger.apiCall(this.source, 'POST', '/groups', startTime); this.logger.info(this.source, `<<< createGroup id=${g.id}`); }),
      catchError(err => { this.logger.apiError(this.source, 'POST', '/groups', err, startTime); throw err; })
    );
  }

  getMyGroups(): Observable<Group[]> {
    const startTime = Date.now();
    this.logger.trace(this.source, '>>> getMyGroups()');
    return this.http.get<Group[]>(`${this.api}/groups/mine`).pipe(
      tap(gs => { this.logger.apiCall(this.source, 'GET', '/groups/mine', startTime); this.logger.debug(this.source, `<<< getMyGroups count=${gs.length}`); }),
      catchError(err => { this.logger.apiError(this.source, 'GET', '/groups/mine', err, startTime); return of([]); })
    );
  }

  getGroup(id: number): Observable<Group | null> {
    const startTime = Date.now();
    this.logger.trace(this.source, `>>> getGroup(${id})`);
    return this.http.get<Group>(`${this.api}/groups/${id}`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/groups/${id}`, startTime)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/groups/${id}`, err, startTime); return of(null); })
    );
  }

  getGroupByToken(token: string): Observable<Group | null> {
    const startTime = Date.now();
    this.logger.trace(this.source, '>>> getGroupByToken()');
    return this.http.get<Group>(`${this.api}/groups/join/${token}`).pipe(
      tap(() => this.logger.apiCall(this.source, 'GET', `/groups/join/${token}`, startTime)),
      catchError(err => { this.logger.apiError(this.source, 'GET', `/groups/join/${token}`, err, startTime); return of(null); })
    );
  }

  joinGroup(token: string): Observable<Group | null> {
    const startTime = Date.now();
    this.logger.trace(this.source, '>>> joinGroup()');
    return this.http.post<Group>(`${this.api}/groups/join/${token}`, {}).pipe(
      tap(g => { this.logger.apiCall(this.source, 'POST', `/groups/join/${token}`, startTime); this.logger.info(this.source, `<<< joinGroup id=${g.id}`); }),
      catchError(err => { this.logger.apiError(this.source, 'POST', `/groups/join/${token}`, err, startTime); throw err; })
    );
  }
}
