export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalDocument = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

export const privacyPolicy: LegalDocument = {
  title: 'Privacy Policy',
  updated: 'October 23, 2026',
  intro:
    'quickqr.app is built so a printed code keeps working without collecting more than the service needs. This policy covers the codes you scan and the links you create.',
  sections: [
    {
      heading: 'What a scan records',
      paragraphs: [
        'When someone opens a dynamic code, the service records the link it opened, a keyed hash of the visitor address with its /24 (IPv4) or /48 (IPv6) network, the device platform, and a category for the browser user agent.',
        "The raw address is not stored, and a scan is not tied to a person's account.",
      ],
    },
    {
      heading: 'No tracking or profiling',
      paragraphs: [
        'The scan page does not set persistent cookies, track browsing histories across other sites, or sell personal profiling data.',
        'A dynamic code may show a brief sponsor screen. The sponsor is chosen by quickqr.app, not from a profile of the person scanning.',
      ],
    },
    {
      heading: 'Static codes stay in the browser',
      paragraphs: [
        'Static compressed codes are decoded entirely in the browser. Decoding sends nothing to the API, and no scan is logged.',
      ],
    },
    {
      heading: 'Accounts and sign-in',
      paragraphs: [
        'If you sign in, quickqr.app stores the email address returned by your sign-in provider, a session token in your browser, and the links you create.',
        'You can sign out at any time and delete links from the dashboard.',
      ],
    },
    {
      heading: 'Changes to this policy',
      paragraphs: [
        'This page is updated when the way the service handles data changes. The date above shows the latest version.',
      ],
    },
  ],
};

export const termsOfService: LegalDocument = {
  title: 'Terms of Service',
  updated: 'October 23, 2026',
  intro: 'These terms cover your use of quickqr.app and the QR codes it creates.',
  sections: [
    {
      heading: 'No subscription expiration',
      paragraphs: [
        'Dynamic codes are not disabled after an arbitrary trial period. A printed code keeps resolving.',
        'Free codes show a brief sponsor screen. Plus and Pro remove it while a paid plan is active, and a code goes back to the Free plan when a paid plan ends. A code is never switched off because a plan ended.',
      ],
    },
    {
      heading: 'Your account',
      paragraphs: [
        'You are responsible for keeping your sign-in method secure and for activity under your account.',
      ],
    },
    {
      heading: 'Your links',
      paragraphs: [
        'You are responsible for the destination behind every code you create and for keeping it lawful. You must have the right to use the content it opens.',
      ],
    },
    {
      heading: 'Prohibited content',
      paragraphs: [
        'Malware, phishing, deceptive redirects, and other abusive or illegal destinations may be deactivated immediately.',
      ],
    },
    {
      heading: 'Availability',
      paragraphs: [
        'The service is provided as it is. We work to keep printed codes resolving, but we cannot promise uninterrupted availability.',
      ],
    },
    {
      heading: 'Limitation of liability',
      paragraphs: [
        'To the extent the law allows, quickqr.app is not liable for lost profits or indirect damages that come from using the service.',
      ],
    },
    {
      heading: 'Changes to these terms',
      paragraphs: [
        'These terms may change as the service changes. The date above shows the latest version. Continuing to use the service after a change means you accept the updated terms.',
      ],
    },
  ],
};
