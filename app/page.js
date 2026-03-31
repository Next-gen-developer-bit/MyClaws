import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import UseCases from '@/components/UseCases';
import HowItWorks from '@/components/HowItWorks';
import Security from '@/components/Security';
import Pricing from '@/components/Pricing';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <UseCases />
      <HowItWorks />
      <Security />
      <Pricing />
      <Footer />
    </main>
  );
}
