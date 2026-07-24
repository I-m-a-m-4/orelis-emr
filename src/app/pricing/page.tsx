
import type { Metadata } from 'next';
import { PricingClientPage } from './client-page';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for clinics of all sizes. Choose the plan that\'s right for your practice and get started with Orelis today.',
};

export default function PricingPage() {
  return <PricingClientPage />;
}
