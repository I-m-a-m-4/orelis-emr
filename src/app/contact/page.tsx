
import type { Metadata } from 'next';
import { ContactClientPage } from './client-page';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the Orelis team. Whether you have a question, want a demo, or need support, we are here to help.',
};

export default function ContactPage() {
  return <ContactClientPage />;
}
