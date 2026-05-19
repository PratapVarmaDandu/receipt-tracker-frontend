import { Injectable } from '@angular/core';

/**
 * Application-wide logging service for frontend
 * Provides structured logging with trace, debug, info, warn, and error levels
 * All logs are timestamped and tagged with the component/service name
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private logLevel: LogLevel = LogLevel.DEBUG;
  private enableConsoleLog = true;
  private logs: LogEntry[] = [];
  private maxLogEntries = 1000;


  constructor() {
    this.setLogLevel(LogLevel.DEBUG);
  }

  /**
   * Set the global log level (TRACE, DEBUG, INFO, WARN, ERROR)
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Enable/disable console output
   */
  setConsoleLogging(enabled: boolean): void {
    this.enableConsoleLog = enabled;
  }

  /**
   * Get all logged entries
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Trace level logging - most verbose, for detailed flow tracing
   * Used for: entering/exiting functions, parameter tracing
   */
  trace(source: string, message: string, data?: any): void {
    if (this.logLevel <= LogLevel.TRACE) {
      this.log(LogLevel.TRACE, source, message, data, 'color: #888; font-style: italic;');
    }
  }

  /**
   * Debug level logging - detailed diagnostic information
   * Used for: intermediate step tracing, variable inspection
   */
  debug(source: string, message: string, data?: any): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.log(LogLevel.DEBUG, source, message, data, 'color: #0066cc;');
    }
  }

  /**
   * Info level logging - important application flow
   * Used for: major operations, transaction starts/ends
   */
  info(source: string, message: string, data?: any): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.log(LogLevel.INFO, source, message, data, 'color: #00aa00; font-weight: bold;');
    }
  }

  /**
   * Warn level logging - potentially harmful situations
   * Used for: recoverable errors, unexpected but handled conditions
   */
  warn(source: string, message: string, data?: any): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.log(LogLevel.WARN, source, message, data, 'color: #ff9900; font-weight: bold;');
    }
  }

  /**
   * Error level logging - error conditions
   * Used for: exceptions, failed operations, critical issues
   */
  error(source: string, message: string, error?: any): void {
    if (this.logLevel <= LogLevel.ERROR) {
      const errorData = error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error;
      this.log(LogLevel.ERROR, source, message, errorData, 'color: #ff0000; font-weight: bold;');
    }
  }

  /**
   * Log an API call with timing information
   * Automatically tracks request start/end
   */
  apiCall(source: string, method: string, endpoint: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.info(source, `API CALL: ${method} ${endpoint} completed in ${duration}ms`);
  }

  /**
   * Log an API error
   */
  apiError(source: string, method: string, endpoint: string, error: any, startTime: number): void {
    const duration = Date.now() - startTime;
    const errorMsg = error?.error?.message || error?.message || 'Unknown error';
    this.error(source, `API ERROR: ${method} ${endpoint} failed after ${duration}ms: ${errorMsg}`, error);
  }

  /**
   * Log transaction start
   */
  transactionStart(source: string, transactionId: string, description: string): void {
    this.info(source, `TRANSACTION START [${transactionId}]: ${description}`);
  }

  /**
   * Log transaction success
   */
  transactionSuccess(source: string, transactionId: string, duration: number, details?: any): void {
    this.info(source, `TRANSACTION SUCCESS [${transactionId}]: completed in ${duration}ms`, details);
  }

  /**
   * Log transaction failure
   */
  transactionError(source: string, transactionId: string, error: any, duration: number): void {
    this.error(source, `TRANSACTION FAILED [${transactionId}]: after ${duration}ms`, error);
  }

  /**
   * Export logs as JSON for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Download logs as a file
   */
  downloadLogs(filename = 'app-logs.json'): void {
    const logsJson = this.exportLogs();
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // ──────────────────────────────────────────────────────────────────────────

  private log(level: LogLevel, source: string, message: string, data?: any, style?: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      source,
      message,
      data
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogEntries) {
      this.logs.shift();
    }

    if (this.enableConsoleLog) {
      const prefix = `[${entry.timestamp}] [${entry.level}] [${source}]`;
      const consoleMethod = this.getConsoleMethod(level);
      const logMessage = data !== undefined ? `${prefix} ${message}` : `${prefix} ${message}`;

      if (style) {
        consoleMethod(`%c${logMessage}`, style, data || '');
      } else {
        consoleMethod(logMessage, data || '');
      }
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.TRACE:
        return console.log;
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }
}

export interface LogEntry {
  timestamp: string;
  level: string;
  source: string;
  message: string;
  data?: any;
}

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4
}
