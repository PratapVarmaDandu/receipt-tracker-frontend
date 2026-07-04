import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

interface ConsoleEntry {
  level: 'error' | 'warn';
  message: string;
  at: string;
}

interface FailedRequest {
  method: string;
  url: string;
  status: number;
  at: string;
}

/**
 * Ring-buffers recent client-side diagnostics so feedback/bug-report
 * submissions can auto-attach context: last console errors/warnings and
 * last failed API calls (status + URL only — never request/response payloads,
 * to avoid leaking sensitive data). Serialized JSON is sent as the
 * `clientLog` field of POST /api/feedback; it is never shown to the user.
 */
@Injectable({ providedIn: 'root' })
export class DiagnosticLogService {
  private static consoleHooked = false;

  private readonly maxConsoleEntries = 20;
  private readonly maxFailedRequests = 5;

  private consoleEntries: ConsoleEntry[] = [];
  private failedRequests: FailedRequest[] = [];

  constructor(private router: Router) {
    this.hookConsole();
  }

  /** Called by DiagnosticLogInterceptor on every failed HTTP response. */
  recordFailedRequest(method: string, url: string, status: number): void {
    this.failedRequests.push({
      method,
      // Strip query string — tokens/params must not travel in the diagnostic bundle
      url: url.split('?')[0],
      status,
      at: new Date().toISOString()
    });
    if (this.failedRequests.length > this.maxFailedRequests) {
      this.failedRequests.shift();
    }
  }

  /** Snapshot the buffers as a JSON string for the submission request. */
  capture(): string {
    return JSON.stringify({
      capturedAt: new Date().toISOString(),
      route: this.router.url,
      userAgent: navigator.userAgent,
      consoleEntries: this.consoleEntries,
      failedRequests: this.failedRequests
    });
  }

  // ────────────────────────────────────────────────────────────────────────

  private hookConsole(): void {
    if (DiagnosticLogService.consoleHooked) {
      return;
    }
    DiagnosticLogService.consoleHooked = true;

    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);

    console.error = (...args: any[]) => {
      this.recordConsole('error', args);
      originalError(...args);
    };
    console.warn = (...args: any[]) => {
      this.recordConsole('warn', args);
      originalWarn(...args);
    };
  }

  private recordConsole(level: 'error' | 'warn', args: any[]): void {
    this.consoleEntries.push({
      level,
      message: args.map(a => this.stringify(a)).join(' ').slice(0, 500),
      at: new Date().toISOString()
    });
    if (this.consoleEntries.length > this.maxConsoleEntries) {
      this.consoleEntries.shift();
    }
  }

  private stringify(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    if (value instanceof Error) {
      return `${value.name}: ${value.message}`;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
