import { useEffect } from 'react';

interface SEOPage {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
}

/**
 * GOD-LEVEL SEO page configurations.
 * Each page targets the most commonly searched terms on the internet
 * with exact-match high-volume phrases people actually type into Google.
 */
const SEO_PAGES: Record<string, SEOPage> = {
  home: {
    title: 'Dora Sheet — Best Free AI Tool for Spreadsheets | Free Excel Alternative',
    description: 'Dora Sheet is the best free AI tool for spreadsheets. Convert PDF to Excel, extract tables from images, generate formulas with AI, collaborate in real-time with video calls, and create dashboards. Free budget template, invoice template, and 7 more. #1 Google Sheets alternative.',
    keywords: 'free tool, free AI tool, free online spreadsheet, PDF to Excel, convert PDF to Excel free, budget template, free budget template, invoice template free, excel alternative, best free excel alternative, Google Sheets alternative, AI spreadsheet, data analysis tool, free data analysis, project management spreadsheet, how to create a budget, how to make a spreadsheet, how to convert PDF to Excel, spreadsheet app free, AI formula generator, collaborative spreadsheet, multiplayer spreadsheet, free productivity tool, team collaboration tool free, best spreadsheet app 2026',
    canonical: 'https://dora-sheet.vercel.app/',
  },
  about: {
    title: 'How Dora Sheet Works — Free Open Source Spreadsheet Architecture',
    description: 'Discover how Dora Sheet was built from scratch: custom virtualized 1000×26 React grid, Web Worker formula engine, LiveKit WebRTC video calls, Redis cell locking, and Socket.IO real-time sync. Best free open source spreadsheet alternative.',
    keywords: 'free open source spreadsheet, how to build a spreadsheet app, custom spreadsheet grid, web worker formula engine, react spreadsheet tutorial, self hosted Google Sheets, free Airtable alternative, best free project management tool, how to make an app like Google Sheets, open source excel alternative, docker spreadsheet app, free collaboration software',
    canonical: 'https://dora-sheet.vercel.app/?about=true',
  },
  templates: {
    title: 'Free Spreadsheet Templates — Budget Template, Invoice, Project Planner | Dora Sheet',
    description: 'Download 9 free spreadsheet templates: Monthly Budget Template, Invoice Generator, Project Planner, Timesheet Tracker, Net Worth Calculator, Grade Calculator, Sales Pipeline, Marketing ROI Calculator, SaaS Metrics Dashboard. No signup required.',
    keywords: 'free budget template, budget template free download, free invoice template, invoice template online free, free timesheet template, project planner template free, how to create a budget, how to make a budget spreadsheet, expense tracker free, net worth calculator free, grade calculator online free, sales pipeline template free, marketing ROI calculator, SaaS metrics template, free spreadsheet templates 2026, monthly budget spreadsheet, project management template free, best free templates',
    canonical: 'https://dora-sheet.vercel.app/?templates=true',
  },
  dashboard: {
    title: 'Free AI Dashboard Creator — Charts, KPI Cards & Data Visualization | Dora Sheet',
    description: 'Create beautiful dashboards and charts for free with AI. Bar, line, area, and pie charts. KPI cards with trend indicators. Animated data visualization. Best free dashboard tool and free data analysis tool.',
    keywords: 'free dashboard creator, free data visualization tool, free chart maker, AI dashboard generator, how to create a dashboard, best free data analysis tool, free KPI dashboard, free analytics tool, create charts online free, data visualization free, business intelligence free, free reporting tool, how to analyze data, spreadsheet charts free, free BI tool, interactive dashboard free',
    canonical: 'https://dora-sheet.vercel.app/dashboard/dashboard?dashboard=true',
  },
  ai: {
    title: 'Free AI Spreadsheet Assistant — PDF to Excel, Formula Generator, Data Cleaning',
    description: 'Free AI tool for spreadsheets. Convert PDF to Excel for free, extract tables from images, generate SUM/AVERAGE/VLOOKUP/IF formulas from plain English, clean messy data, and analyze datasets automatically. Best free AI data analysis tool.',
    keywords: 'free AI tool, convert PDF to Excel free, PDF to Excel online free, extract table from image free, AI formula generator free, how to convert PDF to Excel, how to extract table from image, free data cleaning tool, AI data analysis free, natural language to formula, spreadsheet OCR free, free AI assistant, best free AI tool 2026, automated data entry free, how to clean data in spreadsheet, free AI data tool',
    canonical: 'https://dora-sheet.vercel.app/?ai=true',
  },
};

/**
 * GOD-LEVEL Dynamic DOM SEO Meta Injector.
 * Rewrites title, description, keywords, canonical, OG, and Twitter tags
 * based on active application state — enabling multi-page indexation from a SPA.
 */
export function useSEOMetadata({ isDashboard, showAbout, showTemplates, showAI }: {
  isDashboard: boolean;
  showAbout: boolean;
  showTemplates: boolean;
  showAI: boolean;
}) {
  useEffect(() => {
    let page: SEOPage;
    if (showAbout) page = SEO_PAGES.about;
    else if (showTemplates) page = SEO_PAGES.templates;
    else if (isDashboard) page = SEO_PAGES.dashboard;
    else if (showAI) page = SEO_PAGES.ai;
    else page = SEO_PAGES.home;

    // 1. Document title
    document.title = page.title;

    // 2. Meta tag updater
    const setMeta = (attr: string, key: string, val: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', val);
    };

    // 3. Link tag updater (canonical)
    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // Primary meta
    setMeta('name', 'title', page.title);
    setMeta('name', 'description', page.description);
    setMeta('name', 'keywords', page.keywords);

    // Canonical URL
    setLink('canonical', page.canonical);

    // Open Graph
    setMeta('property', 'og:title', page.title);
    setMeta('property', 'og:description', page.description);
    setMeta('property', 'og:url', page.canonical);

    // Twitter
    setMeta('name', 'twitter:title', page.title);
    setMeta('name', 'twitter:description', page.description);

  }, [isDashboard, showAbout, showTemplates, showAI]);
}
