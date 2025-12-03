export default function CompanyMarquee() {
  const companies = [
    { name: 'Google', logo: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_light_color_272x92dp.png' },
    { name: 'Microsoft', logo: 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b?ver=5c31' },
    { name: 'Amazon', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
    { name: 'Netflix', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg' },
    { name: 'Spotify', logo: 'https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_White.png' },
    { name: 'Airbnb', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg' },
    { name: 'Uber', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png' },
    { name: 'Tesla', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Tesla_Motors.svg' },
  ];

  return (
    <section className="relative py-20 bg-white border-y border-gray-200 overflow-hidden">
      <div className="mb-12 text-center">
        <p className="text-sm uppercase tracking-wider text-gray-600 font-semibold">
          Trusted by teams at
        </p>
      </div>

      {/* Marquee Container */}
      <div className="relative flex overflow-x-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {companies.concat(companies).map((company, idx) => (
            <div
              key={`set1-${idx}`}
              className="mx-8 flex-shrink-0 flex items-center justify-center"
            >
              <img
                src={company.logo}
                alt={company.name}
                className="h-10 w-auto object-contain opacity-40 hover:opacity-60 transition-opacity duration-300 grayscale"
                style={{ maxWidth: '150px' }}
              />
            </div>
          ))}
        </div>
        <div className="flex animate-marquee whitespace-nowrap" aria-hidden="true">
          {companies.concat(companies).map((company, idx) => (
            <div
              key={`set2-${idx}`}
              className="mx-8 flex-shrink-0 flex items-center justify-center"
            >
              <img
                src={company.logo}
                alt={company.name}
                className="h-10 w-auto object-contain opacity-40 hover:opacity-60 transition-opacity duration-300 grayscale"
                style={{ maxWidth: '150px' }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
