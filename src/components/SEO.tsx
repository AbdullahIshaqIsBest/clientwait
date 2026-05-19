import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogType?: string;
}

export const SEO = ({ title, description, canonical, ogType = "website" }: SEOProps) => {
  const siteName = "Divine Minds Mystic Healing";
  const shareImage = "https://73cdi02hfx.ufs.sh/f/0x0XKSZ7lVQtFAEJvCey7tIar0TNZBWqznOLHY8RbvG23EQw";
  const fullTitle = `${title} | ${siteName}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={window.location.origin + (canonical || "")} />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:image" content={shareImage} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={shareImage} />
    </Helmet>
  );
};
