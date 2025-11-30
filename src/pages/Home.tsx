import Hero from '../components/Hero';
import CompanyMarquee from '../components/CompanyMarquee';
import Features from '../components/Features';
import DynamicStaticComparison from '../components/DynamicStaticComparison';
import QRHistory from '../components/QRHistory';

export default function Home() {
  return (
    <>
      <Hero />
      <CompanyMarquee />
      <Features />
      <DynamicStaticComparison />
      <QRHistory />
    </>
  );
}
