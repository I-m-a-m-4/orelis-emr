
import type { Metadata } from 'next';
import { AboutClientPage } from './client-page';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn about the team behind Orelis, our mission to revolutionize healthcare, and our passion for creating powerful, accessible tools for clinics.',
};

export default function AboutPage() {
  return <AboutClientPage />;
}
