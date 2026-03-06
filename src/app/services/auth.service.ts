import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Use a signal for reactive state, reading directly from the environment
  apiKey = signal<string | null>(environment.geminiApiKey || null);

  hasApiKey(): boolean {
    return !!this.apiKey();
  }
}
