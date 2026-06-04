// Central site metadata — edit these in one place.
export const SITE = {
  name: 'Greenbriar Technology Group',
  shortName: 'Greenbriar',
  domain: 'www.greenbriartechnology.com',
  url: 'https://www.greenbriartechnology.com',
  tagline: 'Pragmatic technology consulting for teams that ship.',
  description:
    'Greenbriar Technology Group is a boutique technology consulting practice helping organizations design, build, and modernize software with clarity and craft.',
  email: 'hello@greenbriartechnology.com',
  location: 'Boulder, CO · United States',
  founded: 2026,
};

// Internal hrefs keep a trailing slash so they match the files GitHub Pages
// actually serves (e.g. /about/index.html). Linking to /about would cost every
// visitor a 301 redirect to /about/ on each click.
export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/services/', label: 'Services' },
  { href: '/approach/', label: 'Approach' },
  { href: '/work/', label: 'Work' },
  { href: '/about/', label: 'About' },
  { href: '/contact/', label: 'Contact' },
];
