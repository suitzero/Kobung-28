import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideExperimentalZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideExperimentalZonelessChangeDetection()
  ],
};
