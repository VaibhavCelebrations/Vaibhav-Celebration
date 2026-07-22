/* ===================================================================
   Placeholder Data — REAL demo images + client content from PDFs
   =================================================================== */

// ── Real demo image URLs (children's birthday celebrations) ─────

export const IMAGES = {
  // Hero
  hero: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=900&q=80",
  heroBg: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=1600&q=80",
  heroChild: "https://images.unsplash.com/photo-1602631985686-1bb0e6a8696e?w=600&q=80",

  // Theme images
  spaceTheme: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600&q=90",
  spaceTheme2: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=1600&q=90",
  cocomelonTheme: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1600&q=90",
  cocomelonTheme2: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1600&q=90",
  princessTheme: "https://images.unsplash.com/photo-1535572290543-960a8046f5af?w=1600&q=90",
  princessTheme2: "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=1600&q=90",
  jungleTheme: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=1600&q=90",
  jungleTheme2: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1600&q=90",

  // Gallery images (kids birthday celebrations)
  gallery1: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80",
  gallery2: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&q=80",
  gallery3: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&q=80",
  gallery4: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&q=80",
  gallery5: "https://images.unsplash.com/photo-1602631985686-1bb0e6a8696e?w=600&q=80",
  gallery6: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80",
  gallery7: "https://images.unsplash.com/photo-1535572290543-960a8046f5af?w=600&q=80",
  gallery8: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=600&q=80",
  gallery9: "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=600&q=80",
  gallery10: "https://images.unsplash.com/photo-1504389557504-3c17402e43e1?w=600&q=80",
  gallery11: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80",
  gallery12: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80",

  // Balloons & decor
  balloons1: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&q=80",
  balloons2: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80",
  cake: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80",
  gifts: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&q=80",
  decor1: "https://images.unsplash.com/photo-1504389557504-3c17402e43e1?w=600&q=80",
  party1: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80",

  // Story/About
  story1: "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=700&q=80",
  story2: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=700&q=80",

  // Instagram/social proof
  insta1: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&q=80",
  insta2: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&q=80",
  insta3: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&q=80",
  insta4: "https://images.unsplash.com/photo-1535572290543-960a8046f5af?w=400&q=80",
  insta5: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&q=80",
  insta6: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=400&q=80",
};

// ── Types ───────────────────────────────────────────────────────────

export interface ThemeHighlight {
  icon: string;
  title: string;
  description: string;
}

export interface PlaceholderTheme {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  shortDescription: string;
  fullDescription: string;
  heroImageUrl: string;
  cardImageUrl: string;
  isActive: boolean;
  displayOrder: number;
  seoTitle: string;
  seoDescription: string;
  accentColor: string;
  tags: string[];
  // New admin-friendly fields
  themeCategory: string;
  themeVibe: string;
  galleryImages: string[];
  highlights: ThemeHighlight[];
}

export interface PlaceholderPackageFeature {
  label: string;
  included: boolean;
}

export interface PlaceholderPackage {
  id: string;
  title: string;
  slug: string;
  priceLabel: string;
  tierRank: number;
  isRecommended: boolean;
  description: string;
  features: PlaceholderPackageFeature[];
}

export interface PlaceholderGalleryImage {
  id: string;
  imageUrl: string;
  caption: string;
  altText: string;
  tags: string[];
  aspectRatio: "portrait" | "landscape" | "square";
}

export interface PlaceholderTestimonial {
  id: string;
  customerName: string;
  content: string;
  rating: number;
  role: string;
}

export interface PlaceholderFAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface PlaceholderEvent {
  id: string;
  title: string;
  slug: string;
  location: string;
  theme: string;
  date: string;
  shortDescription: string;
  coverImage: string;
  gallery: string[];
  // Optional testimonial (toggleable in admin)
  testimonialName?: string;
  testimonialContent?: string;
  testimonialRating?: number;
  showTestimonial?: boolean;
}

export interface PlaceholderBlog {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  content: string;
  coverImage: string;
  date: string;
}

// ── Theme Data (from client's Theme Content PDF) ────────────────────

export const placeholderThemes: PlaceholderTheme[] = [
  {
    id: "theme-1",
    title: "Space Theme Celebration",
    slug: "space-theme",
    tagline: "Launch into an unforgettable celebration where every child becomes the hero of their own space adventure.",
    shortDescription: "A cosmic adventure beyond imagination! Turn your child's birthday into an exciting space mission filled with imagination, discovery, and unforgettable memories.",
    fullDescription: "Our Space Birthday Theme creates an immersive celebration where every detail follows one carefully crafted story — from personalised invitations to themed experiences and thoughtful keepsakes.",
    heroImageUrl: IMAGES.spaceTheme,
    cardImageUrl: IMAGES.spaceTheme2,
    isActive: true,
    displayOrder: 1,
    seoTitle: "Space Theme Birthday Celebration | Vaibhav Celebrations",
    seoDescription: "Launch into an unforgettable space birthday celebration — immersive, themed, and memorable for curious young explorers.",
    accentColor: "space",
    tags: ["Adventure", "Discovery", "Ages 4-10"],
    themeCategory: "Birthday",
    themeVibe: "Cosmic & Adventurous",
    galleryImages: [IMAGES.spaceTheme, IMAGES.spaceTheme2, IMAGES.gallery1, IMAGES.gallery4, IMAGES.gallery11, IMAGES.gallery12],
    highlights: [
      { icon: "mail", title: "Custom Invitations", description: "Personalised digital invitations that set the mood before the party." },
      { icon: "palette", title: "Themed Backdrop", description: "A stunning, fully branded backdrop designed for your theme." },
      { icon: "gamepad", title: "Activity Corner", description: "Engaging games and activities to keep kids entertained throughout." },
      { icon: "gift", title: "Return Gifts", description: "Curated, theme-matching return gifts every child will love." },
    ],
  },
  {
    id: "theme-2",
    title: "Cocomelon Theme Celebration",
    slug: "cocomelon-theme",
    tagline: "A joyful celebration where music, laughter, learning, and little smiles come together beautifully.",
    shortDescription: "Fun, colors and joy with Cocomelon & friends! Bring your child's favourite Cocomelon world to life with a thoughtfully designed birthday celebration.",
    fullDescription: "Every element follows one beautiful theme, creating a seamless experience that children love and parents genuinely enjoy — from personalised invitations to engaging moments and meaningful keepsakes.",
    heroImageUrl: IMAGES.cocomelonTheme,
    cardImageUrl: IMAGES.cocomelonTheme2,
    isActive: true,
    displayOrder: 2,
    seoTitle: "Cocomelon Theme Birthday Celebration | Vaibhav Celebrations",
    seoDescription: "A joyful Cocomelon birthday celebration with music, laughter, and beautifully planned details for toddlers.",
    accentColor: "cocomelon",
    tags: ["Toddler", "Music", "Ages 1-4"],
    themeCategory: "Toddler Birthday",
    themeVibe: "Musical & Joyful",
    galleryImages: [IMAGES.cocomelonTheme, IMAGES.cocomelonTheme2, IMAGES.gallery3, IMAGES.gallery5, IMAGES.gallery6, IMAGES.gallery10],
    highlights: [
      { icon: "music", title: "Musical Setup", description: "Cocomelon songs and sing-along corner for the little ones." },
      { icon: "palette", title: "Colorful Décor", description: "Bright, cheerful decorations that bring the Cocomelon world alive." },
      { icon: "cake", title: "Custom Cake", description: "A themed birthday cake designed to match the celebration perfectly." },
      { icon: "gift", title: "Return Gifts", description: "Fun, age-appropriate goodies for every tiny guest." },
    ],
  },
  {
    id: "theme-3",
    title: "Princess Birthday Theme",
    slug: "princess-theme",
    tagline: "Because every little princess deserves a celebration straight out of her favourite fairytale.",
    shortDescription: "An enchanting fairytale celebration! Create a magical birthday experience where dreams become reality for your little princess.",
    fullDescription: "Our Princess Birthday Theme is thoughtfully designed to make your child feel truly special through elegant details, personalised experiences, and beautifully coordinated moments from beginning to end.",
    heroImageUrl: IMAGES.princessTheme,
    cardImageUrl: IMAGES.princessTheme2,
    isActive: true,
    displayOrder: 3,
    seoTitle: "Princess Birthday Theme Celebration | Vaibhav Celebrations",
    seoDescription: "A magical princess birthday celebration with enchanting fairytale details for young dreamers.",
    accentColor: "princess",
    tags: ["Fairytale", "Elegant", "Ages 3-8"],
    themeCategory: "Kids Birthday",
    themeVibe: "Magical & Elegant",
    galleryImages: [IMAGES.princessTheme, IMAGES.princessTheme2, IMAGES.gallery7, IMAGES.gallery9, IMAGES.gallery2, IMAGES.gallery8],
    highlights: [
      { icon: "crown", title: "Royal Dress-Up", description: "Crown-making and dress-up station for the little royals." },
      { icon: "palette", title: "Fairytale Décor", description: "Enchanting pink & gold decorations with floral accents." },
      { icon: "camera", title: "Photo Booth", description: "A themed photo booth with princess props and backdrops." },
      { icon: "gift", title: "Royal Favors", description: "Elegant keepsakes and return gifts fit for royalty." },
    ],
  },
  {
    id: "theme-4",
    title: "Jungle Safari Birthday Theme",
    slug: "jungle-safari-theme",
    tagline: "A wild adventure filled with roaring fun, exciting discoveries, and unforgettable birthday memories.",
    shortDescription: "Step into a world of adventure! A celebration inspired by the beauty of the jungle for little explorers and animal lovers.",
    fullDescription: "Every part of the celebration follows one beautifully connected theme — from personalised invitations to immersive experiences and thoughtful keepsakes for young animal lovers.",
    heroImageUrl: IMAGES.jungleTheme,
    cardImageUrl: IMAGES.jungleTheme2,
    isActive: true,
    displayOrder: 4,
    seoTitle: "Jungle Safari Birthday Theme | Vaibhav Celebrations",
    seoDescription: "A wild jungle safari birthday adventure with immersive experiences for young animal lovers.",
    accentColor: "jungle",
    tags: ["Adventure", "Animals", "Ages 2-8"],
    themeCategory: "Kids Birthday",
    themeVibe: "Wild & Fun",
    galleryImages: [IMAGES.jungleTheme, IMAGES.jungleTheme2, IMAGES.gallery4, IMAGES.gallery8, IMAGES.gallery5, IMAGES.gallery11],
    highlights: [
      { icon: "trees", title: "Safari Setup", description: "Lush greenery, animal cutouts, and immersive jungle décor." },
      { icon: "gamepad", title: "Explorer Games", description: "Treasure hunts, animal spotting, and hands-on activities." },
      { icon: "camera", title: "Safari Photo Zone", description: "An adventure-themed photo booth with jungle props." },
      { icon: "gift", title: "Wild Goodies", description: "Animal-themed return gifts and nature-inspired keepsakes." },
    ],
  },
];

// ── Packages (from client: Basic, Standard, Premium) ────────────────

export const placeholderPackages: PlaceholderPackage[] = [
  {
    id: "pkg-1",
    title: "STANDARD",
    slug: "standard",
    priceLabel: "₹ XX,XXX",
    tierRank: 1,
    isRecommended: false,
    description: "Perfect for intimate celebrations",
    features: [
      { label: "Basic Decorations", included: true },
      { label: "Theme Setup", included: true },
      { label: "Balloons & Props", included: true },
      { label: "Welcome Board", included: true },
      { label: "Return Gifts (Basic)", included: true },
      { label: "Custom Backdrop", included: false },
      { label: "Personalized Details", included: false },
      { label: "Activities & Games", included: false },
    ],
  },
  {
    id: "pkg-2",
    title: "PREMIUM",
    slug: "premium",
    priceLabel: "₹ XX,XXX",
    tierRank: 2,
    isRecommended: true,
    description: "Most loved for memorable celebrations",
    features: [
      { label: "Themed Decorations", included: true },
      { label: "Custom Backdrop", included: true },
      { label: "Balloons & Props", included: true },
      { label: "Personalized Details", included: true },
      { label: "Return Gifts (Standard)", included: true },
      { label: "Basic Activities", included: true },
      { label: "Activities & Games", included: false },
      { label: "Organiser Support", included: false },
    ],
  },
  {
    id: "pkg-3",
    title: "LUX",
    slug: "lux",
    priceLabel: "₹ XX,XXX",
    tierRank: 3,
    isRecommended: false,
    description: "For grand & unforgettable experiences",
    features: [
      { label: "Premium Decorations", included: true },
      { label: "Custom Theme Design", included: true },
      { label: "Balloons & Props", included: true },
      { label: "Personalized Details", included: true },
      { label: "Return Gifts (Premium)", included: true },
      { label: "Activities & Games", included: true },
      { label: "Organiser Support", included: true },
      { label: "Photo Documentation", included: true },
    ],
  },
];

// ── Gallery Images (real birthday photos) ───────────────────────────

export const placeholderGalleryImages: PlaceholderGalleryImage[] = [
  { id: "gal-1", imageUrl: IMAGES.gallery1, caption: "Balloon Celebration Setup", altText: "Colorful birthday balloon celebration", tags: ["Décor", "Balloons"], aspectRatio: "portrait" },
  { id: "gal-2", imageUrl: IMAGES.gallery2, caption: "Party Decorations", altText: "Beautiful party decorations with lights", tags: ["Décor", "Lights"], aspectRatio: "landscape" },
  { id: "gal-3", imageUrl: IMAGES.gallery3, caption: "Gift Wrapping", altText: "Beautifully wrapped birthday gifts", tags: ["Gifts", "Return Gifts"], aspectRatio: "square" },
  { id: "gal-4", imageUrl: IMAGES.gallery4, caption: "Colorful Balloons", altText: "Festive balloon arrangement", tags: ["Balloons", "Décor"], aspectRatio: "portrait" },
  { id: "gal-5", imageUrl: IMAGES.gallery5, caption: "Birthday Celebrations", altText: "Children celebrating birthday", tags: ["Celebration", "Kids"], aspectRatio: "landscape" },
  { id: "gal-6", imageUrl: IMAGES.gallery6, caption: "Birthday Cake", altText: "Custom themed birthday cake", tags: ["Cake", "Food"], aspectRatio: "square" },
  { id: "gal-7", imageUrl: IMAGES.gallery7, caption: "Pink Party Setup", altText: "Pink themed party decorations", tags: ["Princess", "Décor"], aspectRatio: "portrait" },
  { id: "gal-8", imageUrl: IMAGES.gallery8, caption: "Jungle Theme Setup", altText: "Jungle safari themed party setup", tags: ["Jungle", "Décor"], aspectRatio: "portrait" },
  { id: "gal-9", imageUrl: IMAGES.gallery9, caption: "Happy Birthday!", altText: "Birthday celebration with family", tags: ["Celebration", "Family"], aspectRatio: "landscape" },
  { id: "gal-10", imageUrl: IMAGES.gallery10, caption: "Activity Station", altText: "Kids activity corner at party", tags: ["Activities", "Kids"], aspectRatio: "square" },
  { id: "gal-11", imageUrl: IMAGES.gallery11, caption: "Party Vibes", altText: "Fun party atmosphere with confetti", tags: ["Party", "Fun"], aspectRatio: "portrait" },
  { id: "gal-12", imageUrl: IMAGES.gallery12, caption: "Event Setup", altText: "Complete event setup", tags: ["Setup", "Décor"], aspectRatio: "landscape" },
];

// ── Testimonials ────────────────────────────────────────────────────

export const placeholderTestimonials: PlaceholderTestimonial[] = [
  {
    id: "test-1",
    customerName: "Neha Sharma",
    content: "The team made my daughter's birthday absolutely magical! Every detail was so well thought out. I didn't have to worry about a single thing.",
    rating: 5,
    role: "Mother of 2, Jaipur",
  },
  {
    id: "test-2",
    customerName: "Priya Mehta",
    content: "Professional, creative and super cooperative. I highly recommend Vaibhav Celebrations for stress-free parties. They truly understand the vision.",
    rating: 5,
    role: "Parent, Jaipur",
  },
  {
    id: "test-3",
    customerName: "Rohan & Sneha",
    content: "The return gifts and theme setup were beyond our expectations. Thank you for such beautiful memories! Our son loved every moment.",
    rating: 5,
    role: "Parents, Jaipur",
  },
];

// ── FAQs ────────────────────────────────────────────────────────────

export const placeholderFAQs: PlaceholderFAQ[] = [
  { id: "faq-1", question: "How far in advance should I book?", answer: "We recommend booking at least 2-3 weeks in advance to ensure availability and allow time for personalization. For peak season (October-March), earlier booking is advisable.", category: "Booking" },
  { id: "faq-2", question: "Can I customize a package?", answer: "Absolutely! Every package is customizable. You can add extra return gifts, activity kits, décor upgrades, and more. Your consultation will cover all customization options.", category: "Packages" },
  { id: "faq-3", question: "What payment methods do you accept?", answer: "We accept all major payment methods including UPI, credit/debit cards, and net banking. Full payment is required at the time of booking.", category: "Payments" },
  { id: "faq-4", question: "Do you handle the venue decoration?", answer: "Yes! All our packages include theme-based décor. We transform your chosen venue into a themed celebration space.", category: "Events" },
  { id: "faq-5", question: "What is your cancellation policy?", answer: "Our detailed cancellation and refund policy is available on the Refund Policy page. We recommend reviewing it before booking.", category: "Booking" },
  { id: "faq-6", question: "Can I see samples of your themes?", answer: "Yes! Each theme page includes details about the celebration experience. You can also request a consultation to discuss your vision.", category: "Themes" },
];

// ── Blogs ───────────────────────────────────────────────────────────

export const placeholderBlogs: PlaceholderBlog[] = [
  {
    id: "blog-1",
    title: "5 Magical Ideas for Your Child's Next Birthday",
    slug: "magical-birthday-ideas",
    shortDescription: "Discover how to transform an ordinary celebration into a magical memory with these simple yet highly effective themed ideas.",
    content: "Planning a child's birthday can be both exciting and overwhelming. To make the day truly special, it's not just about the decorations, but about creating an immersive experience that tells a story. From personalised invitations that set the tone, to curated activities that keep the kids engaged, every detail matters. \n\n1. Establish a Storyline: Instead of just picking a color scheme, pick a storyline. If it's a space theme, the invitations are 'mission briefings', the entrance is a 'spaceship airlock', and the cake cutting is 'landing on Mars'.\n\n2. Interactive Food Stations: Kids love feeling independent. A DIY cupcake decorating station or a build-your-own trail mix bar acts as both food and an activity.\n\n3. Experiential Return Gifts: Instead of plastic toys, give them an experience to take home. A small potted plant they can grow, or a mini DIY telescope kit from the space mission.\n\nBy focusing on the narrative rather than just the visuals, you create a memory that lasts long after the balloons have deflated.",
    coverImage: IMAGES.spaceTheme,
    date: "August 16, 2024"
  }
];

// ── Events ──────────────────────────────────────────────────────────

export const placeholderEvents: PlaceholderEvent[] = [
  {
    id: "event-1",
    title: "Grand 1st Birthday Celebration",
    slug: "grand-1st-birthday",
    location: "Fairmont Hotel, Jaipur",
    theme: "Royal Princess",
    date: "November 12, 2024",
    shortDescription: "A magical and elegant first birthday celebration featuring custom floral installations, a bespoke dessert table, and a fully immersive Royal Princess experience for 80 guests.",
    coverImage: IMAGES.princessTheme,
    gallery: [IMAGES.gallery1, IMAGES.gallery2, IMAGES.gallery3, IMAGES.gallery7, IMAGES.gallery10, IMAGES.gallery12],
    showTestimonial: true,
    testimonialName: "Neha & Rahul Sharma",
    testimonialContent: "The team turned our vision into something far beyond what we imagined. Our daughter's first birthday was truly magical — every guest was in awe. We couldn't have asked for a more perfect celebration.",
    testimonialRating: 5,
  }
];

// ── Helpers ──────────────────────────────────────────────────────────

export function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getGalleryTags(): string[] {
  const tags = new Set<string>();
  placeholderGalleryImages.forEach((img) => img.tags.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}
