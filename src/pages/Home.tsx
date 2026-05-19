import { motion } from "motion/react";
import { SEO } from "../components/SEO";
import { useEffect, useState } from "react";
import { getHomePageImages } from "../services/ShopifyService";

const FALLBACK_IMAGES = [
  {
    url: "https://73cdi02hfx.ufs.sh/f/0x0XKSZ7lVQtFAEJvCey7tIar0TNZBWqznOLHY8RbvG23EQw",
    alt: "Divine Minds Mystic Healing - Vision",
  },
  {
    url: "https://73cdi02hfx.ufs.sh/f/0x0XKSZ7lVQtmFn1bw66HykinMfa5bwu7XFUYDZIPNQqWlvJ",
    alt: "Divine Minds Mystic Healing - Reset",
  },
  {
    url: "https://73cdi02hfx.ufs.sh/f/0x0XKSZ7lVQtsEe9CSahSXdliuvGkTz8woxRcnUPNAqW1yKY",
    alt: "Divine Minds Mystic Healing - Purpose",
  }
];

export default function Home() {
  const [images, setImages] = useState<any[]>(FALLBACK_IMAGES);

  useEffect(() => {
    async function loadImages() {
      try {
        const shopifyImages = await getHomePageImages();
        if (shopifyImages && shopifyImages.length > 0) {
          setImages(shopifyImages);
        }
      } catch (err) {
        console.warn("Using fallback images");
      }
    }
    loadImages();
  }, []);

  return (
    <div className="bg-white min-h-screen">
      <SEO 
        title="Divine Minds Mystic Healing — The 21-Day Reset" 
        description="A guided healing and self-reflection experience."
      />

      <div className="flex flex-col">
        {images.map((img, index) => (
          <motion.section 
            key={img.url || index}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="w-full"
          >
            <img 
              src={img.url} 
              alt={img.alt || "Healing Journey"} 
              className="w-full h-auto block"
            />
          </motion.section>
        ))}
      </div>
    </div>
  );
}
