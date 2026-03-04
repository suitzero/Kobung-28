import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'gemini_api_key';

  // Use a signal for reactive state
  apiKey = signal<string | null>(localStorage.getItem(this.STORAGE_KEY));

  setApiKey(key: string) {
    localStorage.setItem(this.STORAGE_KEY, key);
    this.apiKey.set(key);
  }

  clearApiKey() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.apiKey.set(null);
  }

  hasApiKey(): boolean {
    return !!this.apiKey();
  }
}
