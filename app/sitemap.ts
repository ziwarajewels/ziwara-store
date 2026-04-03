// app/sitemap.ts
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ziwarajewels.vercel.app';

  // Static pages
  const staticRoutes = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/our-story`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
  ];

  // Dynamic product pages (will be populated from Supabase)
  let productRoutes: MetadataRoute.Sitemap = [];

  try {
    const { data: products } = await fetch(`${baseUrl}/api/products`, {
      next: { revalidate: 3600 }, // revalidate every hour
    }).then(res => res.json());

    if (products && Array.isArray(products)) {
      productRoutes = products.map((product: any) => ({
        url: `${baseUrl}/product/${product.id}`,
        lastModified: new Date(product.updated_at || product.created_at),
        changeFrequency: 'weekly' as const,
        priority: 0.85,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch products for sitemap:', error);
  }

  return [...staticRoutes, ...productRoutes];
}