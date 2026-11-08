import * as vscode from 'vscode';
import { ProviderType, UsageStats } from '../../shared/protocol';

interface PersistentUsageRecord {
  hourly: Record<string, Record<ProviderType, number>>;
  daily: Record<string, Record<ProviderType, number>>;
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
      record.hourly[hourKey] = { anthropic: 0, gemini: 0, openai: 0 };
    }
    if (!record.daily[dayKey]) {
      record.daily[dayKey] = { anthropic: 0, gemini: 0, openai: 0 };
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

    const hourData = record.hourly[hourKey] || { anthropic: 0, gemini: 0, openai: 0 };
    const dayData = record.daily[dayKey] || { anthropic: 0, gemini: 0, openai: 0 };

    const callsThisHour =
      (hourData.anthropic || 0) + (hourData.gemini || 0) + (hourData.openai || 0);
    const callsToday =
      (dayData.anthropic || 0) + (dayData.gemini || 0) + (dayData.openai || 0);

    return {
      callsThisHour,
      callsToday,
      currentHourLabel: hourKey,
      currentDayLabel: dayKey,
      byProvider: {
        anthropic: {
          hour: hourData.anthropic || 0,
          day: dayData.anthropic || 0,
        },
        gemini: {
          hour: hourData.gemini || 0,
          day: dayData.gemini || 0,
        },
        openai: {
          hour: hourData.openai || 0,
          day: dayData.openai || 0,
        },
      },
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
