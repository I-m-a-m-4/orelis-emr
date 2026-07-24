
import type { Metadata } from 'next';
import { FeaturesClientPage } from './client-page';

export const metadata: Metadata = {
  title: 'Features',
  description: 'Discover the powerful features that make Orelis the leading solution for modern healthcare management, from patient scheduling to AI-driven insights.',
};

export default function FeaturesPage() {
  return <FeaturesClientPage />;
}
