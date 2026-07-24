
'use client';
import Link from 'next/link';
import { Footer } from '@/components/layout/footer';
import { AnimatedLegalBackground } from '@/components/layout/animated-legal-background';
import { PublicHeader } from '@/components/layout/public-header';

export default function PrivacyPage() {
  return (
    <div className="bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-300 selection:bg-zinc-700 selection:text-white">
      <PublicHeader />

      <main className="relative pt-16 overflow-hidden">
        <AnimatedLegalBackground />
        <div className="relative z-10">
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-semibold my-2">
                    <span className="legal-word" style={{animationDelay: '100ms'}}>Privacy</span>{' '}
                    <span className="legal-word" style={{animationDelay: '300ms'}}>Policy</span>
                    </h1>
                    <p className="font-mono my-2 text-lg sm:text-xl text-zinc-400 opacity-80 legal-word" style={{animationDelay: '500ms'}}>
                    Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </section>

            <section className="py-16">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 prose prose-invert prose-lg prose-headings:font-headline prose-headings:font-semibold prose-headings:text-primary prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-p:text-zinc-400 prose-p:leading-relaxed prose-h2:mb-4 prose-h2:mt-12 prose-h2:text-3xl">
                <p>
                Welcome to Orelis ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how your <u>personal information is collected, used, and disclosed</u> by Orelis. This policy applies to all users of our clinic management software and related services.
                </p>

                <h2 className="mt-12">Information We Collect</h2>
                <p>
                We may collect personal information from you, such as your <u>name, email address, phone number, and medical information</u>, when you register for an account, use our services, or communicate with us. We also collect information about your usage of our services, including but not limited to, appointment details and patient records. For operational purposes, we may also collect technical data such as <u>IP addresses and device information</u>.
                </p>
                
                <h2 className="mt-12">How We Use Your Information</h2>
                <p>
                We use the information we collect to <u>provide, operate, and maintain our services</u>. This includes managing your account, providing customer support, processing transactions, and sending you service-related communications. We may also use your information to improve our services, for research and analytics (in an anonymized and aggregated form), and to comply with legal obligations.
                </p>

                <h2 className="mt-12">Information Sharing and Disclosure</h2>
                <p>
                We <u>do not sell, trade, or otherwise transfer</u> to outside parties your personally identifiable information unless we provide users with advance notice. This does not include website hosting partners and other parties who assist us in operating our website, conducting our business, or serving our users, so long as those parties agree to keep this information confidential and comply with applicable data protection laws.
                </p>

                <h2 className="mt-12">Data Security</h2>
                <p>
                We implement a variety of <u>industry-standard security measures</u> to maintain the safety of your personal information. Your personal information is contained behind secured networks and is only accessible by a limited number of persons who have special access rights to such systems, and are required to keep the information confidential. All sensitive information you supply is encrypted via <u>Secure Socket Layer (SSL) technology</u>.
                </p>

                <h2 className="mt-12">Your Rights</h2>
                <p>
                Depending on your location, you may have certain rights regarding your personal information, such as the <u>right to access, correct, or delete your data</u>. You can also object to or restrict certain processing of your data. Please contact us to exercise these rights, and we will respond in accordance with applicable laws.
                </p>

                <h2 className="mt-12">Changes to This Policy</h2>
                <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
                </p>

                <h2 className="mt-12">Contact Us</h2>
                <p>
                If you have any questions about this Privacy Policy, please contact us at <a href="mailto:privacy@orelis.com">privacy@orelis.com</a>.
                </p>
            </div>
            </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
