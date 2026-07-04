import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DiagnosticLogService } from '../services/diagnostic-log.service';

/** Feeds failed HTTP responses (status + URL only) into the diagnostic ring buffer. */
@Injectable()
export class DiagnosticLogInterceptor implements HttpInterceptor {
  constructor(private diagnosticLog: DiagnosticLogService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      tap({
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse) {
            this.diagnosticLog.recordFailedRequest(req.method, req.url, err.status);
          }
        }
      })
    );
  }
}
