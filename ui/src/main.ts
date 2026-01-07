import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { registerLocaleData } from '@angular/common';
import localeIn from '@angular/common/locales/en-IN';

// Register Indian locale
registerLocaleData(localeIn);

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

