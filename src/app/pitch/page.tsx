
import type { Metadata } from 'next';
import { PitchClientPage } from './client-page';

export const metadata: Metadata = {
  title: 'Pitch Deck',
  description: 'Orelis Investor Pitch Deck.',
};

export default function PitchPage() {
  return <PitchClientPage />;
}
