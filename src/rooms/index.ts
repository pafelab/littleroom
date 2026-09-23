import { Bakery } from './Bakery';
import { Butcher } from './Butcher';
import { Florist } from './Florist';
import { FortuneTeller } from './FortuneTeller';
import { Office } from './Office';
import { Restaurant } from './Restaurant';
import type { RoomModule } from './types';

/** Carousel order. Slot i sits at 45° + i·60° around the pivot. */
export const ROOMS: readonly RoomModule[] = [Florist, FortuneTeller, Bakery, Restaurant, Office, Butcher];
