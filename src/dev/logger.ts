export interface LogEntry {
  timestamp: string;
  type: 'generate' | 'parse' | 'save' | 'error' | 'analyze';
  label: string;
  data: unknown;
}

class DevLogger {
  private entries: LogEntry[] = [];

  log(type: LogEntry['type'], label: string, data: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString().slice(11, 23),
      type,
      label,
      data,
    };
    this.entries.push(entry);
    console.log(`[${entry.timestamp}] [${type.toUpperCase()}] ${label}`, data);
  }

  clear() { this.entries = []; }

  getEntries() { return [...this.entries]; }

  toText(): string {
    return this.entries.map(e =>
      `[${e.timestamp}] ${e.type.toUpperCase()} — ${e.label}\n${JSON.stringify(e.data, null, 2)}`
    ).join('\n\n---\n\n');
  }
}

export const devLogger = new DevLogger();
