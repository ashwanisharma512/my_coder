import * as vscode from 'vscode';
import { ProviderType, UsageStats } from '../../shared/protocol';

interface PersistentUsageRecord {
  hourly: Record<string, Partial<Record<ProviderType, number>>>;
  daily: Record<string, Partial<Record<ProviderType, number>>>;
}

export class UsageTracker {
  private static readonly STORAGE_KEY = 'my_coder_usage_stats_v1';

  constructor(private readonly globalState: vscode.Memento) {}

  private getHourKey(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:00`;
  }

  private getDayKey(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  private loadRecord(): PersistentUsageRecord {
    return this.globalState.get<PersistentUsageRecord>(UsageTracker.STORAGE_KEY, {
      hourly: {},
      daily: {},
    });
  }

  public async recordApiCall(provider: ProviderType): Promise<UsageStats> {
    const record = this.loadRecord();
    const hourKey = this.getHourKey();
    const dayKey = this.getDayKey();

    if (!record.hourly[hourKey]) {
      record.hourly[hourKey] = {};
    }
    if (!record.daily[dayKey]) {
      record.daily[dayKey] = {};
    }

    record.hourly[hourKey][provider] = (record.hourly[hourKey][provider] || 0) + 1;
    record.daily[dayKey][provider] = (record.daily[dayKey][provider] || 0) + 1;

    // Prune entries older than 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const key of Object.keys(record.daily)) {
      if (new Date(key).getTime() < sevenDaysAgo) {
        delete record.daily[key];
      }
    }

    await this.globalState.update(UsageTracker.STORAGE_KEY, record);
    return this.getStats();
  }

  public getStats(): UsageStats {
    const record = this.loadRecord();
    const hourKey = this.getHourKey();
    const dayKey = this.getDayKey();

    const hourData = record.hourly[hourKey] || {};
    const dayData = record.daily[dayKey] || {};

    const providers: ProviderType[] = ['anthropic', 'gemini', 'openai', 'groq', 'ollama'];

    let callsThisHour = 0;
    let callsToday = 0;
    const byProvider: any = {};

    for (const p of providers) {
      const hCount = hourData[p] || 0;
      const dCount = dayData[p] || 0;
      callsThisHour += hCount;
      callsToday += dCount;
      byProvider[p] = { hour: hCount, day: dCount };
    }

    return {
      callsThisHour,
      callsToday,
      currentHourLabel: hourKey,
      currentDayLabel: dayKey,
      byProvider,
    };
  }

  public async resetStats(): Promise<UsageStats> {
    await this.globalState.update(UsageTracker.STORAGE_KEY, {
      hourly: {},
      daily: {},
    });
    return this.getStats();
  }
}
