
interface LogEntry {
  timestamp: string;
  severity: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  serviceName: string;
  filePath?: string;
  lineNumber?: number;
  message: string;
  data?: any;
  userId?: string;
}

class Logger {
  private static logQueue: LogEntry[] = [];
  private static isProcessing = false;
  private static webhookUrl: string | null = null;
  private static batchSize = 100;
  private static batchTimeout = 2000; // 2 seconds

  private static getCallerInfo(): { filePath?: string; lineNumber?: number } {
    try {
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        // Skip first 3 lines (Error, this function, and the calling log function)
        const callerLine = lines[3];
        const match = callerLine?.match(/\((.*):(\d+):\d+\)/) || callerLine?.match(/at (.*):(\d+):\d+/);
        if (match) {
          return {
            filePath: match[1]?.split('/').pop() || match[1],
            lineNumber: parseInt(match[2])
          };
        }
      }
    } catch (error) {
      // Ignore errors in stack trace parsing
    }
    return {};
  }

  private static async log(severity: LogEntry['severity'], message: string, data?: any): Promise<void> {
    const { filePath, lineNumber } = this.getCallerInfo();
    
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      severity,
      serviceName: typeof window !== 'undefined' ? 'frontend' : 'backend',
      filePath,
      lineNumber,
      message,
      data,
      userId: await this.getCurrentUserId()
    };

    // Always log to console for development
    const consoleMessage = `[${logEntry.severity}] ${logEntry.message}`;
    switch (severity) {
      case 'DEBUG':
        console.debug(consoleMessage, data);
        break;
      case 'INFO':
        console.info(consoleMessage, data);
        break;
      case 'WARN':
        console.warn(consoleMessage, data);
        break;
      case 'ERROR':
        console.error(consoleMessage, data);
        break;
    }

    // Add to queue for webhook dispatch
    this.logQueue.push(logEntry);
    this.processQueue();
  }

  private static async getCurrentUserId(): Promise<string | undefined> {
    try {
      if (typeof window !== 'undefined') {
        // Frontend - try to get from supabase auth
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id;
      }
    } catch (error) {
      // Ignore errors in user ID retrieval
    }
    return undefined;
  }

  private static async processQueue(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get webhook URL if not cached
      if (this.webhookUrl === null) {
        await this.loadWebhookUrl();
      }

      if (this.webhookUrl && this.logQueue.length > 0) {
        const batch = this.logQueue.splice(0, this.batchSize);
        await this.sendToWebhook(batch);
      }
    } catch (error) {
      console.error('Failed to process log queue:', error);
    } finally {
      this.isProcessing = false;
      
      // Schedule next batch if there are more logs
      if (this.logQueue.length > 0) {
        setTimeout(() => this.processQueue(), this.batchTimeout);
      }
    }
  }

  private static async loadWebhookUrl(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'logging_webhook_url')
          .single();
        
        if (data?.value) {
          const url = typeof data.value === 'string' ? data.value : String(data.value);
          this.webhookUrl = url.replace(/"/g, '') || '';
        }
      }
    } catch (error) {
      this.webhookUrl = '';
    }
  }

  private static async sendToWebhook(logs: LogEntry[]): Promise<void> {
    if (!this.webhookUrl) return;

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs,
          timestamp: new Date().toISOString(),
          source: 'auratodo'
        })
      });
    } catch (error) {
      console.error('Failed to send logs to webhook:', error);
    }
  }

  static debug(message: string, data?: any): Promise<void> {
    return this.log('DEBUG', message, data);
  }

  static info(message: string, data?: any): Promise<void> {
    return this.log('INFO', message, data);
  }

  static warn(message: string, data?: any): Promise<void> {
    return this.log('WARN', message, data);
  }

  static error(message: string, data?: any): Promise<void> {
    return this.log('ERROR', message, data);
  }

  static setWebhookUrl(url: string): void {
    this.webhookUrl = url;
  }
}

export { Logger };
