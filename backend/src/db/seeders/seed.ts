import { getDb } from "../index";
import { series, products, productVariants } from "../schema";

async function seed() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available for seeding");
    return;
  }

  console.log("Seeding Sofa Co. series and products...");

  const seriesList = [
    { name: "Bobby", slug: "bobby", description: "Modular comfort designed for modern living.", imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80" },
    { name: "Diane", slug: "diane", description: "Timeless elegance with sleek tailored lines.", imageUrl: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80" },
    { name: "Isla", slug: "isla", description: "Generous proportions and effortless sophistication.", imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80" },
    { name: "Nimbus", slug: "nimbus", description: "Cloud-like cushioning for ultimate relaxation.", imageUrl: "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1200&q=80" },
    { name: "Paloma", slug: "paloma", description: "Statement architectural silhouettes.", imageUrl: "https://images.unsplash.com/photo-1550254417-ead6e92f5da7?auto=format&fit=crop&w=1200&q=80" },
    { name: "Stanton", slug: "stanton", description: "Classic craftsmanship with deep seating comfort.", imageUrl: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80" },
    { name: "Stanton II", slug: "stanton-ii", description: "Refined evolution of our most beloved silhouette.", imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80" },
  ];

  for (const s of seriesList) {
    await db.insert(series).values(s).onDuplicateKeyUpdate({ set: { description: s.description } });
  }

  console.log("Series seeded successfully.");
}

seed().catch(console.error);
