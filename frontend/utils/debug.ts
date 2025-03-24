import { isDevelopment } from './environment';

export interface DebugLog {
  timestamp: string;
  type: 'info' | 'error' | 'warning';
  message: string;
  data?: any;
  headers?: Record<string, string>;
}

class DebugLogger {
  private static instance: DebugLogger;
  private logs: DebugLog[] = [];
  private readonly MAX_LOGS = 100;

  private constructor() {}

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  private formatLog(log: DebugLog): string {
    return `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}${
      log.data ? `\nData: ${JSON.stringify(log.data, null, 2)}` : ''
    }${log.headers ? `\nHeaders: ${JSON.stringify(log.headers, null, 2)}` : ''}`;
  }

  private addLog(log: DebugLog) {
    this.logs.push(log);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }

    if (isDevelopment) {
      console.log(this.formatLog(log));
    }
  }

  info(message: string, data?: any, headers?: Record<string, string>) {
    this.addLog({
      timestamp: new Date().toISOString(),
      type: 'info',
      message,
      data,
      headers,
    });
  }

  error(message: string, data?: any, headers?: Record<string, string>) {
    this.addLog({
      timestamp: new Date().toISOString(),
      type: 'error',
      message,
      data,
      headers,
    });
  }

  warning(message: string, data?: any, headers?: Record<string, string>) {
    this.addLog({
      timestamp: new Date().toISOString(),
      type: 'warning',
      message,
      data,
      headers,
    });
  }

  getLogs(): DebugLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  downloadLogs() {
    const content = this.logs.map(log => this.formatLog(log)).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const debugLogger = DebugLogger.getInstance();

// AWS X-Ray header utilities
export const getAwsHeaders = (headers: Headers): Record<string, string> => {
  const awsHeaders: Record<string, string> = {};
  const awsHeaderPrefixes = [
    'x-amz-trace-id',
    'x-amz-id-trace',
    'x-amz-request-id',
    'x-amz-id-2',
    'x-amz-cf-id',
    'x-amz-cloudfront-id',
    'x-amz-cognito-identity-id',
    'x-amz-user-id',
    'x-amz-identity-id',
  ];

  awsHeaderPrefixes.forEach(prefix => {
    const value = headers.get(prefix);
    if (value) {
      awsHeaders[prefix] = value;
    }
  });

  return awsHeaders;
};

// CORS debugging utilities
export const logCorsIssue = (request: Request, response: Response) => {
  const origin = request.headers.get('origin');
  const method = request.method;
  const path = new URL(request.url).pathname;
  const status = response.status;

  debugLogger.warning('CORS Issue Detected', {
    origin,
    method,
    path,
    status,
    requestHeaders: Object.fromEntries(request.headers.entries()),
    responseHeaders: Object.fromEntries(response.headers.entries()),
  });
};

// API request debugging
export const logApiRequest = async (
  request: Request,
  response: Response,
  data?: any
) => {
  const awsHeaders = getAwsHeaders(response.headers);
  
  debugLogger.info('API Request', {
    url: request.url,
    method: request.method,
    status: response.status,
    awsHeaders,
    data,
  });
}; 