import React, { useEffect } from 'react';

interface SEOHeadProps {
  currentPage: string;
}

interface PageMeta {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  ogType?: string;
  h1Text?: string;
}

const PAGE_META_MAP: Record<string, PageMeta> = {
  home: {
    title: 'IndoFleet | Enterprise UAV Fleet Operations & Aerospace Logistics - IndoWings',
    description: 'IndoFleet by IndoWings is India\'s leading DGCA-compliant enterprise UAV fleet command platform managing drone manufacturing, pre-flight QC clearance, and air corridor transit.',
    keywords: 'IndoFleet, IndoWings, UAV fleet management, DGCA NPNT drone software, enterprise UAV logistics, drone corridor telemetry, Make in India drones',
    canonical: 'https://indowings.com/',
  },
  platform: {
    title: 'UAV Fleet Management Platform & Architecture | IndoWings IndoFleet',
    description: 'Explore the 3-tiered IndoFleet software architecture: Ground Control Station, Command Center Cloud API, and DGCA DigitalSky airspace authorization integration.',
    keywords: 'UAV platform, GCS software architecture, drone fleet telemetry API, DGCA DigitalSky integration, enterprise UAV control',
    canonical: 'https://indowings.com/platform',
  },
  'command-center': {
    title: 'IndoWings Fleet Command Center & Real-Time Airspace Operations',
    description: 'Centralized mission control dashboard for enterprise UAV fleets. Monitor live sortie telemetry, geofence compliance, and automated air corridor clearance.',
    keywords: 'drone command center, UAV flight mission control, real-time drone telemetry, airspace geofence monitoring',
    canonical: 'https://indowings.com/command-center',
  },
  gcs: {
    title: 'IndoWings Ground Control Station (GCS) | Avionics Software & Mission Planner',
    description: 'Download and inspect IndoWings Ground Control Station (GCS) software with 5.8GHz telemetry uplink, RTK swath planning, and emergency failsafe RTH.',
    keywords: 'IndoWings GCS, ground control station software, RTK drone route planner, UAV flight control software',
    canonical: 'https://indowings.com/gcs',
  },
  downloads: {
    title: 'Download IndoWings GCS Software & Operations Manuals | IndoFleet',
    description: 'Official download repository for IndoWings GCS Windows/Linux releases, Android APKs, SHA256 checksums, and certified operations documentation.',
    keywords: 'download IndoWings GCS, UAV operations manual PDF, GCS firmware release, drone operations software',
    canonical: 'https://indowings.com/downloads',
  },
  versions: {
    title: 'Enterprise UAV Firmware & GCS Release Notes | IndoWings',
    description: 'Detailed changelog and release history for IndoWings UAV autopilot firmware, GCS telemetry modules, and DigitalSky NPNT cryptographic security updates.',
    keywords: 'IndoWings release notes, UAV firmware updates, GCS changelog, DGCA NPNT patch notes',
    canonical: 'https://indowings.com/versions',
  },
  track: {
    title: 'Real-Time Drone Flight Telemetry & Air Corridor Radar | IndoFleet',
    description: 'Track active commercial drone sorties in real time. Inspect live GPS coordinates, altitude AGL, battery cell health, and signed digital handover challans.',
    keywords: 'live drone tracking, UAV flight radar, air corridor transit tracking, drone handover tracking',
    canonical: 'https://indowings.com/track',
  },
  docs: {
    title: 'IndoFleet Enterprise UAV Documentation & Flight SOP Manuals | IndoWings',
    description: 'Comprehensive technical SOPs, pre-flight hardware diagnostics checklists, DGCA NPNT clearance workflows, and receiving base handover procedures.',
    keywords: 'drone operating procedure SOP, DGCA NPNT checklist, UAV hardware QC documentation',
    canonical: 'https://indowings.com/docs',
  },
  support: {
    title: 'IndoFleet Operations Helpdesk & 24/7 Technical Support | IndoWings',
    description: 'Get direct technical support from IndoWings flight operations engineers for avionics troubleshooting, RTK calibration, or corridor logistics.',
    keywords: 'IndoWings support desk, UAV technical helpline, drone operations engineer callback',
    canonical: 'https://indowings.com/support',
  },
  company: {
    title: 'About IndoWings | Pioneer of Make in India Enterprise UAV Hardware',
    description: 'IndoWings is India\'s premier drone manufacturer engineering high-end UAV hardware, custom flight controllers, and autonomous fleet platforms.',
    keywords: 'IndoWings company, Make in India drone manufacturer, enterprise UAV manufacturing India',
    canonical: 'https://indowings.com/company',
  },
  feedback: {
    title: 'Fleet Operations Feedback & Inquiries | IndoFleet',
    description: 'Submit operational feedback, suggestions, or feature requests directly to the IndoWings engineering and product development teams.',
    keywords: 'IndoWings feedback, UAV review, drone fleet suggestions',
    canonical: 'https://indowings.com/feedback',
  },
  legal: {
    title: 'Legal Compliance, DGCA Airspace Rules & Privacy Policy | IndoWings',
    description: 'Review legal terms, DGCA airspace regulations, data security standards, and privacy protection protocols governing IndoFleet operations.',
    keywords: 'DGCA drone regulations, IndoWings privacy policy, UAV airspace compliance legal',
    canonical: 'https://indowings.com/legal',
  },
};

export const SEOHead: React.FC<SEOHeadProps> = ({ currentPage }) => {
  useEffect(() => {
    const meta = PAGE_META_MAP[currentPage] || PAGE_META_MAP.home;

    // 1. Update Title
    document.title = meta.title;

    // 2. Update Meta Description
    let descElem = document.querySelector('meta[name="description"]');
    if (!descElem) {
      descElem = document.createElement('meta');
      descElem.setAttribute('name', 'description');
      document.head.appendChild(descElem);
    }
    descElem.setAttribute('content', meta.description);

    // 3. Update Meta Keywords
    let kwElem = document.querySelector('meta[name="keywords"]');
    if (!kwElem) {
      kwElem = document.createElement('meta');
      kwElem.setAttribute('name', 'keywords');
      document.head.appendChild(kwElem);
    }
    kwElem.setAttribute('content', meta.keywords);

    // 4. Update Canonical Link
    let canonicalElem = document.querySelector('link[rel="canonical"]');
    if (!canonicalElem) {
      canonicalElem = document.createElement('link');
      canonicalElem.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalElem);
    }
    canonicalElem.setAttribute('href', meta.canonical);

    // 5. Update Open Graph Tags
    const updateOg = (property: string, content: string) => {
      let ogElem = document.querySelector(`meta[property="${property}"]`);
      if (!ogElem) {
        ogElem = document.createElement('meta');
        ogElem.setAttribute('property', property);
        document.head.appendChild(ogElem);
      }
      ogElem.setAttribute('content', content);
    };

    updateOg('og:title', meta.title);
    updateOg('og:description', meta.description);
    updateOg('og:url', meta.canonical);
    updateOg('og:type', 'website');
    updateOg('og:site_name', 'IndoFleet by IndoWings');
    updateOg('og:image', 'https://indowings.com/indowings-hero.png');

    // 6. Update Twitter Card Tags
    const updateTwitter = (name: string, content: string) => {
      let twElem = document.querySelector(`meta[name="${name}"]`);
      if (!twElem) {
        twElem = document.createElement('meta');
        twElem.setAttribute('name', name);
        document.head.appendChild(twElem);
      }
      twElem.setAttribute('content', content);
    };

    updateTwitter('twitter:card', 'summary_large_image');
    updateTwitter('twitter:title', meta.title);
    updateTwitter('twitter:description', meta.description);
    updateTwitter('twitter:image', 'https://indowings.com/indowings-hero.png');

    // 7. Inject Dynamic Breadcrumb JSON-LD
    let scriptElem = document.getElementById('jsonld-breadcrumbs');
    if (!scriptElem) {
      scriptElem = document.createElement('script');
      scriptElem.id = 'jsonld-breadcrumbs';
      scriptElem.setAttribute('type', 'application/ld+json');
      document.head.appendChild(scriptElem);
    }

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'Home',
          'item': 'https://indowings.com/'
        },
        ...(currentPage !== 'home' ? [{
          '@type': 'ListItem',
          'position': 2,
          'name': meta.title.split('|')[0].trim(),
          'item': meta.canonical
        }] : [])
      ]
    };

    scriptElem.textContent = JSON.stringify(breadcrumbSchema);

  }, [currentPage]);

  return null;
};
