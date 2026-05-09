import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { LucideAngularModule, icons } from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(LucideAngularModule.pick(icons))
  ]
};
