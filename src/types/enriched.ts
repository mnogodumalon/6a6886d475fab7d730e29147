import type { Reservierungen } from './app';

export type EnrichedReservierungen = Reservierungen & {
  tischName: string;
};
