import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { registerLocaleData } from '@angular/common';
import localeIn from '@angular/common/locales/en-IN';

// Register Indian locale
registerLocaleData(localeIn);

// Suppress browser extension errors
window.addEventListener('error', (event) => {
  // Suppress "Attempting to use a disconnected port object" errors from browser extensions
  if (event.message && event.message.includes('disconnected port')) {
    event.preventDefault();
  }
});

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

