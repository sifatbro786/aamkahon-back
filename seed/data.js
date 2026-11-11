// seed/data.js
//
// THE single source of Aamkahon demo content. Used by:
//   scripts/seed.js           -> writes it into MongoDB (dev / VPS)
//   scripts/buildFixtures.js  -> writes API-shaped JSON into amkahon-front for
//                                the static (Vercel) demo
// Keeping one source means the demo site and a freshly seeded database never
// disagree. Edit content here, then re-run both scripts.
//
// Rules for copy in this file: it renders in the storefront, so no dashes in
// UI text (house style), English UI with Bangla names alongside.
//
// Images: relative paths are served by the Next.js app from /public. Admin
// uploads later come back as absolute BASE_URL/uploads/... URLs; the
// storefront handles both.

export const SITE = {
    name: "Aamkahon",
    nameBn: "আমকাহন",
    tagline: "The story of mangoes",
    phone: "01301-377225",
    whatsapp: "8801301377225",
    location: "Rajshahi, Bangladesh",
    facebook: "https://www.facebook.com/AAMKAHON",
};

// Owner's words from the Facebook bio (also in amkahon-front lib/site.js).
const SITE_BIO_BN = "আম কেবল একটি ফলের নাম নয় বরং আম জড়িয়ে থাকে আমাদের স্বপ্ন এবং সম্ভবনায় তাই এর শুদ্ধতা আমাদের অঙ্গীকার।";

export const OWNER = {
    name: "Solaiman Islam Sifat",
    email: "solaimanislamsifat@gmail.com",
    password: "11111111",
    role: "admin", // admin and executive pass the same gates; no super_admin role
};

const img = (file, alt) => ({ url: `/images/${file}`, alt, public_id: `seed/${file}` });

// ─── Categories (children reference parents by key) ───────────────────────────
export const CATEGORIES = [
    {
        key: "mango",
        name: "Mango",
        description: "Rajshahi and Chapainawabganj mangoes, picked late on purpose so every box arrives fully ripe.",
        image: img("ripe-mangoes-branch.jpg", "Ripe mangoes on the branch"),
    },
    {
        key: "mango-rajshahi",
        parent: "mango",
        name: "Rajshahi Mango",
        description: "Gopalbhog, Khirsapat and Langra from orchards around Rajshahi.",
        image: img("gopalbhog-net-rajshahi.jpg", "Gopalbhog in a net bag, Rajshahi"),
    },
    {
        key: "mango-chapai",
        parent: "mango",
        name: "Chapainawabganj Mango",
        description: "Late season varieties: Amrapali, Surma Fazli, BARI 4 and Gourmoti.",
        image: img("mangoes-on-tree-bagged.jpg", "Mangoes hanging in an orchard"),
    },
    {
        key: "gur",
        name: "Khejurer Gur",
        description: "Date palm jaggery from the winter tap. Patali, jhola and nolen, made in small batches.",
        image: img("gur-clay-pots.jpg", "Clay pots of date palm gur"),
    },
    {
        key: "gur-patali",
        parent: "gur",
        name: "Patali Gur",
        description: "Set into cakes in clay moulds. Keeps for months.",
        image: img("date-palm-tree.jpg", "Date palm tree"),
    },
    {
        key: "gur-liquid",
        parent: "gur",
        name: "Jhola and Nolen Gur",
        description: "Pourable gur, the first sap of the season.",
        image: img("gur-clay-pots.jpg", "Jhola gur in clay pots"),
    },
    {
        key: "pantry",
        name: "Farm Pantry",
        description: "Small batch staples we make between seasons.",
        image: img("gawa-ghee-jars.jpg", "Jars of gawa ghee"),
    },
];

const MANGO_PACKS = (prices, wholesale) => ({
    hasVariants: true,
    variantOptions: [{ name: "Pack", values: ["10 kg box", "20 kg box"] }],
    // weight includes the carton; shipping charges by this
    variants: [
        { options: [{ name: "Pack", value: "10 kg box" }], basePrice: prices[0], wholesalePrice: wholesale[0], weight: 10.8, stock: 0, sku: null, order: 0 },
        { options: [{ name: "Pack", value: "20 kg box" }], basePrice: prices[1], wholesalePrice: wholesale[1], weight: 21.5, stock: 0, sku: null, order: 1 },
    ],
});

const MANGO_GALLERY = (main, ...rest) => [
    { name: "Main", images: [main, ...rest] },
];

const attrs = (o) => Object.entries(o).map(([key, value]) => ({ key, value }));

// ─── Products ─────────────────────────────────────────────────────────────────
// Prices in BDT. Mango is out of season in November, so every mango is a
// 2027 pre-booking (harvest dates from Aamkahon's own mango calendar: the
// district date plus their deliberate late harvest).
export const PRODUCTS = [
    {
        key: "gopalbhog",
        category: "mango",
        subCategory: "mango-rajshahi",
        name: "Gopalbhog Mango",
        nameBn: "গোপালভোগ",
        sku: "AK-MG-GPB",
        unit: "box",
        description:
            "The first mango of the Rajshahi season. Thin skin, no fibre, and a honeyed sweetness that is gone by the end of June. The district opens harvest on 22 May; we wait seven more days so the fruit finishes ripening on the tree.",
        bulletPoints: [
            "Harvested 30 May, seven days after the district date",
            "Formalin and carbide free, ripened naturally",
            "Packed in ventilated 10 kg and 20 kg cartons",
        ],
        ...MANGO_PACKS([1350, 2600], [1150, 2250]),
        basePrice: 1350,
        stock: 0,
        wholesale: { enabled: true, minQty: 5, price: 1150 },
        availability: "pre_order",
        preOrder: { expectedDate: "2027-05-30", advancePercent: 25, maxQtyPerOrder: 200, note: "Ships from 30 May 2027" },
        imageGroups: MANGO_GALLERY(
            img("gopalbhog-net-rajshahi.jpg", "Gopalbhog mangoes in a net bag"),
            img("mango-cut-halves.jpg", "Gopalbhog cut open"),
            img("aamkahon-box-10kg.jpg", "Aamkahon 10 kg carton"),
        ),
        attributes: attrs({ Origin: "Rajshahi", Season: "Pre-booking 2027", Harvest: "30 May", Sweetness: "Very sweet" }),
        isFeatured: true,
        displayOrder: 1,
    },
    {
        key: "khirsapat",
        category: "mango",
        subCategory: "mango-rajshahi",
        name: "Khirsapat Mango",
        nameBn: "ক্ষীরসাপাত",
        sku: "AK-MG-KSP",
        unit: "box",
        description:
            "Known in Dhaka as Himsagar. Deep yellow flesh, a faint milky aroma and almost no fibre. GI registered. We pick five days after the district opens harvest on 30 May.",
        bulletPoints: ["Harvested 4 June", "GI registered variety", "Best eaten within four days of arrival"],
        ...MANGO_PACKS([1500, 2900], [1300, 2550]),
        basePrice: 1500,
        stock: 0,
        wholesale: { enabled: true, minQty: 5, price: 1300 },
        availability: "pre_order",
        preOrder: { expectedDate: "2027-06-04", advancePercent: 25, maxQtyPerOrder: 200, note: "Ships from 4 June 2027" },
        imageGroups: MANGO_GALLERY(
            img("ripe-mangoes-branch.jpg", "Khirsapat ripening on the branch"),
            img("mango-cut-halves.jpg", "Khirsapat flesh"),
            img("packing-house-boxes.jpg", "Packing house"),
        ),
        attributes: attrs({ Origin: "Rajshahi", Season: "Pre-booking 2027", Harvest: "4 June", Sweetness: "Very sweet" }),
        isFeatured: true,
        displayOrder: 2,
    },
    {
        key: "langra",
        category: "mango",
        subCategory: "mango-rajshahi",
        name: "Langra Mango",
        nameBn: "ল্যাংড়া",
        sku: "AK-MG-LNG",
        unit: "box",
        description:
            "Stays green when ripe, so judge it by smell, not colour. Juicy, slightly tangy near the skin, and the variety most people mean when they say Rajshahi mango.",
        bulletPoints: ["Harvested 17 June", "Green skin when ripe", "Popular for wholesale and gifting"],
        ...MANGO_PACKS([1300, 2500], [1100, 2150]),
        basePrice: 1300,
        stock: 0,
        wholesale: { enabled: true, minQty: 5, price: 1100 },
        availability: "pre_order",
        preOrder: { expectedDate: "2027-06-17", advancePercent: 25, maxQtyPerOrder: 200, note: "Ships from 17 June 2027" },
        imageGroups: MANGO_GALLERY(
            img("sorting-green-mangoes.jpg", "Langra being sorted"),
            img("founder-orchard.jpg", "In the orchard"),
            img("aamkahon-box-10kg.jpg", "Aamkahon carton"),
        ),
        attributes: attrs({ Origin: "Rajshahi", Season: "Pre-booking 2027", Harvest: "17 June", Sweetness: "Sweet and tangy" }),
        isFeatured: true,
        displayOrder: 3,
    },
    {
        key: "amrapali",
        category: "mango",
        subCategory: "mango-chapai",
        name: "Amrapali Mango",
        nameBn: "আম্রপালি",
        sku: "AK-MG-AMP",
        unit: "box",
        description:
            "Small, deep orange and intensely sweet. The flesh is dense enough to slice cleanly, which makes it the favourite for children and for dessert.",
        bulletPoints: ["Harvested 22 June", "Highest sugar of the season", "Small fruit, around 4 to 6 per kg"],
        ...MANGO_PACKS([1250, 2400], [1050, 2050]),
        basePrice: 1250,
        stock: 0,
        wholesale: { enabled: true, minQty: 5, price: 1050 },
        availability: "pre_order",
        preOrder: { expectedDate: "2027-06-22", advancePercent: 25, maxQtyPerOrder: 200, note: "Ships from 22 June 2027" },
        imageGroups: MANGO_GALLERY(
            img("mango-cut-halves.jpg", "Amrapali cut open"),
            img("mangoes-on-tree-bagged.jpg", "Amrapali on the tree"),
        ),
        attributes: attrs({ Origin: "Chapainawabganj", Season: "Pre-booking 2027", Harvest: "22 June", Sweetness: "Very sweet" }),
        displayOrder: 4,
    },
    {
        key: "surma-fazli",
        category: "mango",
        subCategory: "mango-chapai",
        name: "Surma Fazli Mango",
        nameBn: "সুরমা ফজলি",
        sku: "AK-MG-FZL",
        unit: "box",
        description:
            "Large and long, often over 700 g a fruit. Mild, fragrant and good value by the kilo, which is why restaurants and sweet shops order it by the crate.",
        bulletPoints: ["Harvested 27 June", "Big fruit, 1 to 2 per kg", "Great for juice and amsotto"],
        ...MANGO_PACKS([1050, 2000], [900, 1700]),
        basePrice: 1050,
        stock: 0,
        wholesale: { enabled: true, minQty: 5, price: 900 },
        availability: "pre_order",
        preOrder: { expectedDate: "2027-06-27", advancePercent: 20, maxQtyPerOrder: 300, note: "Ships from 27 June 2027" },
        imageGroups: MANGO_GALLERY(
            img("mangoes-on-tree-bagged.jpg", "Surma Fazli on the tree"),
            img("packing-house-boxes.jpg", "Cartons ready to ship"),
        ),
        attributes: attrs({ Origin: "Chapainawabganj", Season: "Pre-booking 2027", Harvest: "27 June", Sweetness: "Mild" }),
        displayOrder: 5,
    },
    {
        key: "bari-4",
        category: "mango",
        subCategory: "mango-chapai",
        name: "BARI 4 Mango",
        nameBn: "বারি ৪",
        sku: "AK-MG-BR4",
        unit: "box",
        description:
            "A late hybrid from the Bangladesh Agricultural Research Institute. Firm, sweet and travels well, so it is the one we recommend for long courier routes.",
        bulletPoints: ["Harvested 15 July", "Travels well outside Dhaka", "Firm, sliceable flesh"],
        ...MANGO_PACKS([1200, 2300], [1000, 1950]),
        basePrice: 1200,
        stock: 0,
        wholesale: { enabled: true, minQty: 5, price: 1000 },
        availability: "pre_order",
        preOrder: { expectedDate: "2027-07-15", advancePercent: 25, maxQtyPerOrder: 200, note: "Ships from 15 July 2027" },
        imageGroups: MANGO_GALLERY(
            img("sorting-green-mangoes.jpg", "BARI 4 being sorted"),
            img("aamkahon-box-10kg.jpg", "Aamkahon carton"),
        ),
        attributes: attrs({ Origin: "Chapainawabganj", Season: "Pre-booking 2027", Harvest: "15 July", Sweetness: "Sweet" }),
        displayOrder: 6,
    },
    {
        key: "gourmoti",
        category: "mango",
        subCategory: "mango-chapai",
        name: "Gourmoti Mango",
        nameBn: "গৌড়মতি",
        sku: "AK-MG-GRM",
        unit: "box",
        description:
            "The last mango of the year, harvested in August when everything else is gone. Yield changes a lot year to year, so we confirm the price once the crop is set.",
        bulletPoints: ["Harvested 10 August", "Price confirmed in July", "Limited quantity"],
        ...MANGO_PACKS([0, 0], [null, null]),
        basePrice: 0,
        stock: 0,
        priceVisibility: "tba",
        availability: "pre_order",
        preOrder: { expectedDate: "2027-08-10", advancePercent: 25, note: "Price announced July 2027" },
        imageGroups: MANGO_GALLERY(img("ripe-mangoes-branch.jpg", "Late season mangoes")),
        attributes: attrs({ Origin: "Chapainawabganj", Season: "Pre-booking 2027", Harvest: "10 August", Sweetness: "Sweet" }),
        displayOrder: 7,
    },
    {
        key: "export-khirsapat",
        category: "mango",
        subCategory: "mango-rajshahi",
        name: "Export Grade Khirsapat",
        nameBn: "রপ্তানিযোগ্য ক্ষীরসাপাত",
        sku: "AK-MG-EXP",
        unit: "kg",
        description:
            "Hand graded, hot water treated and packed to importer specification. For exporters, supershops and corporate gifting. Minimum 500 kg. Tell us the destination and volume and we will send a quote.",
        bulletPoints: ["Minimum order 500 kg", "Hot water treatment on request", "Phytosanitary paperwork support"],
        hasVariants: false,
        basePrice: 0,
        stock: 0,
        minOrderQty: 500,
        weight: 1.05,
        priceVisibility: "inquiry",
        availability: "pre_order",
        preOrder: { expectedDate: "2027-06-04", advancePercent: 30 },
        imageGroups: MANGO_GALLERY(
            img("packing-house-boxes.jpg", "Export cartons in the packing house"),
            img("sorting-green-mangoes.jpg", "Hand grading"),
        ),
        attributes: attrs({ Origin: "Rajshahi", Season: "Pre-booking 2027", Grade: "Export" }),
        displayOrder: 8,
    },
    {
        key: "patali-gur",
        category: "gur",
        subCategory: "gur-patali",
        name: "Khejurer Patali Gur",
        nameBn: "খেজুরের পাটালি গুড়",
        sku: "AK-GR-PTL",
        unit: "pack",
        description:
            "Date palm sap boiled down over a wood fire and set in clay moulds. Crumbly, smoky and not too sweet. No sugar or hydros added, which is why it is slightly darker than market patali.",
        bulletPoints: ["No added sugar, no hydros", "From this winter's tap", "Keeps three months in a cool dry place"],
        hasVariants: true,
        variantOptions: [{ name: "Pack", values: ["1 kg", "2 kg", "5 kg"] }],
        variants: [
            { options: [{ name: "Pack", value: "1 kg" }], basePrice: 650, wholesalePrice: 560, weight: 1.1, stock: 120, order: 0 },
            { options: [{ name: "Pack", value: "2 kg" }], basePrice: 1250, wholesalePrice: 1080, weight: 2.15, stock: 80, order: 1 },
            { options: [{ name: "Pack", value: "5 kg" }], basePrice: 3000, wholesalePrice: 2600, weight: 5.3, stock: 40, order: 2 },
        ],
        basePrice: 650,
        stock: 240,
        wholesale: { enabled: true, minQty: 10, price: 560 },
        availability: "in_stock",
        imageGroups: [
            { name: "Main", images: [img("date-palm-tree.jpg", "Date palm tapped for sap"), img("gur-clay-pots.jpg", "Gur in clay pots")] },
        ],
        attributes: attrs({ Origin: "Rajshahi", Season: "Winter 2026", Type: "Patali" }),
        isFeatured: true,
        displayOrder: 9,
    },
    {
        key: "jhola-gur",
        category: "gur",
        subCategory: "gur-liquid",
        name: "Khejurer Jhola Gur",
        nameBn: "খেজুরের ঝোলা গুড়",
        sku: "AK-GR-JHL",
        unit: "pack",
        description:
            "Pourable gur for pitha, payesh and a spoon straight from the pot. Sold in a sealed jar or the traditional clay pot.",
        bulletPoints: ["Pourable consistency", "Clay pot or glass jar", "Refrigerate after opening"],
        hasVariants: true,
        variantOptions: [{ name: "Pack", values: ["1 kg jar", "2 kg clay pot"] }],
        variants: [
            { options: [{ name: "Pack", value: "1 kg jar" }], basePrice: 550, wholesalePrice: 480, weight: 1.4, stock: 90, order: 0 },
            { options: [{ name: "Pack", value: "2 kg clay pot" }], basePrice: 1050, wholesalePrice: 920, weight: 2.9, stock: 45, order: 1 },
        ],
        basePrice: 550,
        stock: 135,
        wholesale: { enabled: true, minQty: 10, price: 480 },
        availability: "in_stock",
        imageGroups: [
            { name: "Main", images: [img("gur-clay-pots.jpg", "Jhola gur in clay pots"), img("founder-bottle-desk.jpg", "Bottled gur")] },
        ],
        attributes: attrs({ Origin: "Jashore", Season: "Winter 2026", Type: "Jhola" }),
        isFeatured: true,
        displayOrder: 10,
    },
    {
        key: "nolen-gur",
        category: "gur",
        subCategory: "gur-liquid",
        name: "Nolen Gur Premium",
        nameBn: "নলেন গুড়",
        sku: "AK-GR-NLN",
        unit: "jar",
        description:
            "Only the first sap of the first cold nights. Lighter in colour, floral, and gone by mid January. One kilogram glass jar.",
        bulletPoints: ["First sap of the season", "Available December to mid January", "1 kg glass jar"],
        hasVariants: false,
        basePrice: 750,
        stock: 60,
        weight: 1.4,
        wholesale: { enabled: true, minQty: 12, price: 650 },
        availability: "in_stock",
        imageGroups: [{ name: "Main", images: [img("founder-jar-packing.jpg", "Packing nolen gur jars")] }],
        attributes: attrs({ Origin: "Jashore", Season: "Winter 2026", Type: "Nolen" }),
        displayOrder: 11,
    },
    {
        key: "gawa-ghee",
        category: "pantry",
        name: "Premium Gawa Ghee",
        nameBn: "প্রিমিয়াম গাওয়া ঘি",
        sku: "AK-PN-GHE",
        unit: "jar",
        description:
            "Slow cooked from cultured cream in small batches. Grainy, golden and nutty. Sealed with paper and thread the old way.",
        bulletPoints: ["Made from cultured cream", "Small batch, slow cooked", "Glass jar, paper sealed"],
        hasVariants: true,
        variantOptions: [{ name: "Size", values: ["500 g", "1 kg"] }],
        variants: [
            { options: [{ name: "Size", value: "500 g" }], basePrice: 850, wholesalePrice: 780, weight: 0.75, stock: 70, order: 0 },
            { options: [{ name: "Size", value: "1 kg" }], basePrice: 1650, wholesalePrice: 1500, weight: 1.35, stock: 40, order: 1 },
        ],
        basePrice: 850,
        stock: 110,
        wholesale: { enabled: true, minQty: 12, price: 780 },
        availability: "in_stock",
        imageGroups: [
            { name: "Main", images: [img("gawa-ghee-jars.jpg", "Gawa ghee jars"), img("founder-jar-display.jpg", "Holding a jar of ghee")] },
        ],
        attributes: attrs({ Origin: "Rajshahi", Season: "All year", Type: "Ghee" }),
        displayOrder: 12,
    },
];

// ─── Homepage sections (attribute-based, admin editable) ──────────────────────
export const SECTIONS = [
    {
        key: "prebook-2027",
        title: "Pre-book the 2027 season",
        description: "Lock today's price with a 25% advance. Pay the rest on delivery.",
        attributeKey: "Season",
        attributeValue: "Pre-booking 2027",
        // Pre-booking runs before the harvest; in mango season the in-season
        // shelf takes over (add it in Admin > Product sections, tag "mango").
        seasons: ["winter", "all"],
        productLimit: 8,
        sortBy: "createdAt",
        sortOrder: "asc",
        displayOrder: 1,
    },
    {
        key: "winter-gur",
        title: "Winter gur, fresh this week",
        description: "From the date palms of Rajshahi and Jashore.",
        attributeKey: "Season",
        attributeValue: "Winter 2026",
        seasons: ["winter", "all"],
        productLimit: 8,
        sortBy: "createdAt",
        sortOrder: "asc",
        displayOrder: 2,
    },
];

// ─── Hero ─────────────────────────────────────────────────────────────────────
// One full screen hero (no slider). Desktop and mobile get their own media:
// phones play the vertical orchard reel, desktop shows a landscape image until
// a landscape video is uploaded from Admin > Homepage hero.
// One full screen hero. Desktop: an image slider across the three product
// lines (only the background changes; headline and buttons stay put). Phones:
// the vertical orchard reel. Edit in Admin > Homepage hero.
const HERO_COPY = {
    title: "Mangoes picked late, on purpose",
    subtitle: "Rajshahi mangoes, winter khejurer gur and gawa ghee, straight from the people who make them. Wholesale and retail.",
    buttonText: "Pre-book mangoes",
    buttonLink: "/shop?availability=pre_order",
};
export const HERO_CONTENT = [
    { key: "hero-desktop", ...HERO_COPY, season: "mango", label: "Rajshahi mango", mediaType: "image", mediaUrl: "/images/mango-cut-halves.jpg", deviceType: "desktop", order: 0 },
    { key: "hero-desktop-gur", ...HERO_COPY, season: "winter", label: "Khejurer gur", mediaType: "image", mediaUrl: "/images/gur-clay-pots.jpg", deviceType: "desktop", order: 1 },
    { key: "hero-desktop-ghee", ...HERO_COPY, season: "all", label: "Gawa ghee", mediaType: "image", mediaUrl: "/images/gawa-ghee-jars.jpg", deviceType: "desktop", order: 2 },
    { key: "hero-mobile", ...HERO_COPY, season: "all", label: "Orchard", mediaType: "video", mediaUrl: "/videos/hero-loop.mp4", deviceType: "mobile", order: 0 },
];

export const HERO_ITEMS = [
    {
        key: "slide-gur",
        title: "Winter gur is here",
        subtitle: "Patali, jhola and nolen from this season's tap.",
        buttonText: "Shop gur",
        mediaType: "image",
        mediaUrl: "/images/gur-clay-pots.jpg",
        deviceType: "both",
        order: 0,
        duration: 6000,
    },
    {
        key: "slide-wholesale",
        title: "Buying for a shop or office?",
        subtitle: "Wholesale prices start at 5 boxes. Bigger volumes, ask us for a quote.",
        buttonText: "Wholesale",
        mediaType: "image",
        mediaUrl: "/images/packing-house-boxes.jpg",
        deviceType: "both",
        order: 1,
        duration: 6000,
    },
];

// ─── Navbar ───────────────────────────────────────────────────────────────────
export const NAV_ITEMS = [
    { name: "Mango", type: "category", category: "mango", order: 0 },
    { name: "Khejurer Gur", type: "category", category: "gur", order: 1 },
    { name: "Pantry", type: "category", category: "pantry", order: 2 },
    { name: "Wholesale", type: "link", path: "/wholesale", order: 3 },
    { name: "Our Story", type: "link", path: "/story", order: 4 },
];

// ─── Shipping (weight based; admin can change everything) ─────────────────────
// baseCharge covers the first baseWeightKg; each started extra kg adds perKgCharge.
export const SHIPPING_RATES = [
    { locationType: "dhaka_inside", deliveryType: "Home Delivery", baseCharge: 120, baseWeightKg: 5, perKgCharge: 15 },
    { locationType: "dhaka_sub", deliveryType: "Home Delivery", baseCharge: 150, baseWeightKg: 5, perKgCharge: 18 },
    { locationType: "outside_dhaka", deliveryType: "Home Delivery", baseCharge: 200, baseWeightKg: 5, perKgCharge: 22 },
    { locationType: "outside_dhaka", deliveryType: "Courier", baseCharge: 160, baseWeightKg: 5, perKgCharge: 18 },
].map((r) => ({ ...r, codChargeType: "percentage", codChargeValue: 1, isActive: true }));


// ─── Reviews (DEMO CONTENT) ───────────────────────────────────────────────────
// Placeholder reviews so product pages and the homepage are not empty during
// development and in the static demo. They are written for this seed, not
// collected from customers. Before launch, replace them with real reviews
// (the Facebook page has 13) or remove them:  npm run seed -- --purge-demo-reviews
// Seed reviewers use the @seed.aamkahon.local domain so they are easy to find.
export const SEED_REVIEWERS = [
    "Nusrat Jahan",
    "Mahmudul Hasan",
    "Farzana Akter",
    "Tanvir Rahman",
    "Sharmin Sultana",
    "Rakib Hossain",
    "Ayesha Siddiqua",
    "Imran Chowdhury",
];

// [productKey, reviewerIndex, rating, comment, daysAgo]
export const REVIEWS = [
    ["gopalbhog", 0, 5, "Ordered two boxes last season. Every single mango was ripe and sweet, nothing sour or chemical smelling. Booking again for 2027.", 160],
    ["gopalbhog", 3, 5, "গত বছর গোপালভোগ নিয়েছিলাম, বাজারের আমের সাথে কোনো তুলনাই হয় না। প্যাকিংও খুব ভালো ছিল।", 150],
    ["khirsapat", 1, 5, "Proper Rajshahi Khirsapat. The box arrived in Dhaka in two days and only one fruit was bruised, which they replaced next order.", 140],
    ["khirsapat", 6, 4, "Very sweet and fragrant. Took one extra day to reach Sylhet, but the fruit held up fine.", 138],
    ["langra", 2, 5, "Langra stays green so I was nervous, but they ripened perfectly on the counter in two days. Kids loved them.", 128],
    ["amrapali", 4, 5, "আম্রপালি এত মিষ্টি হতে পারে জানতাম না। ছোট সাইজ কিন্তু স্বাদ অসাধারণ।", 122],
    ["surma-fazli", 5, 4, "We buy Fazli in bulk for our sweet shop. Good size, fair wholesale price, and they call before dispatch.", 118],
    ["patali-gur", 7, 5, "Real patali gur, slightly smoky and not overly sweet. You can tell there is no sugar mixed in.", 12],
    ["patali-gur", 0, 5, "শীতের পিঠার জন্য পাটালি নিলাম। ঘ্রাণটাই আসল খেজুরের গুড়ের মতো।", 8],
    ["jhola-gur", 3, 5, "The clay pot jhola gur is exactly like what we had in the village. Perfect for payesh.", 9],
    ["nolen-gur", 2, 5, "Nolen gur this good is hard to find in Dhaka. Light, floral, gone in a week at our house.", 6],
    ["gawa-ghee", 6, 4, "Grainy, nutty ghee with a proper aroma. The paper and thread seal is a lovely touch.", 20],
];

// ─── Storefront content (Admin > Homepage & season) ───────────────────────────
// November: gur is in stock and 2027 mango pre-booking is open, so winter is
// active. The owner switches season from the admin; copy below is a start.
export const STOREFRONT = {
    activeSeason: "winter",
    seasons: {
        winter: {
            announcement: "Khejurer gur is in stock now. 2027 mango pre-booking is open.",
            heroEyebrow: "Rajshahi · winter",
            heroTitle: "Gur from the winter tap",
            heroSubtitle: "Patali, jhola and nolen gur boiled over a wood fire, no sugar added. 2027 mango pre-booking is open too.",
            heroButtonText: "Shop winter gur",
            heroButtonLink: "/shop?category=khejurer-gur",
            heroSecondaryText: "Pre-book 2027 mangoes",
            heroSecondaryLink: "/shop?availability=pre_order",
            blocks: { seasonBoard: true, harvestCalendar: true, wholesaleBand: false, testimonials: true, orchardReels: true, delivery: true, story: true, faq: true },
        },
        mango: {
            announcement: "Mango season is on. Picked late, packed the same day.",
            heroEyebrow: "Rajshahi · mango season",
            heroTitle: "Mangoes picked late, on purpose",
            heroSubtitle: "Gopalbhog, Khirsapat, Langra and more, ripened on the tree and packed the day they are picked.",
            heroButtonText: "Shop mangoes",
            heroButtonLink: "/shop?category=mango",
            heroSecondaryText: "Wholesale by phone",
            heroSecondaryLink: "/wholesale",
            blocks: { seasonBoard: false, harvestCalendar: true, wholesaleBand: true, testimonials: true, orchardReels: true, delivery: true, story: true, faq: true },
        },
        all: {
            announcement: "Gawa ghee all year. Ask us about the next mango and gur season.",
            heroEyebrow: "Rajshahi · since 2021",
            heroTitle: "The story of mangoes",
            heroSubtitle: HERO_COPY.subtitle,
            heroButtonText: "Shop now",
            heroButtonLink: "/shop",
            heroSecondaryText: "Our story",
            heroSecondaryLink: "/story",
            blocks: { seasonBoard: true, harvestCalendar: true, wholesaleBand: true, testimonials: true, orchardReels: true, delivery: true, story: true, faq: true },
        },
    },
    // Owner spotlight on /story and the homepage story block. Name left empty
    // on purpose: the client fills it in Admin > Our story.
    story: {
        ownerName: "",
        ownerRole: "Founder, Aamkahon",
        ownerPhoto: "/images/founder-jar-display.jpg",
        ownerPhotoAlt: "The founder of Aamkahon with jars of gur and ghee",
        quote: SITE_BIO_BN,
        quoteLang: "bn",
        note: "A mango is not just a fruit. Our dreams and our livelihood grow with it, so keeping it pure is our promise.",
        facts: [
            { label: "Started", value: "2021" },
            { label: "Orchards", value: "Rajshahi" },
            { label: "Delivered to", value: "64 districts" },
        ],
    },
};

// Plain text answers. `seasons` empty = always shown.
export const FAQS = [
    {
        key: "prebook",
        question: "How does mango pre-booking work?",
        answer: "You pay an advance online (the percentage is shown on each product) and we hold your box for the harvest. The expected date is on the product page. The rest is paid when the mangoes reach you.",
        seasons: ["winter", "all"],
    },
    {
        key: "cod",
        question: "Can I pay cash on delivery?",
        answer: "For most orders, yes: you pay the delivery charge and a small COD fee online, and the rest to the courier. Some products travel with couriers that do not collect cash, so those are paid in full online. Checkout shows which applies to your bag.",
        seasons: [],
    },
    {
        key: "delivery-charge",
        question: "How is the delivery charge worked out?",
        answer: "By your area and the weight of the parcel. The exact amount is shown at checkout before you pay.",
        seasons: [],
    },
    {
        key: "where",
        question: "Where do you deliver?",
        answer: "Anywhere in Bangladesh. Choose home delivery, or pick up from a courier branch in your district where available.",
        seasons: [],
    },
    {
        key: "wholesale",
        question: "Do you sell wholesale?",
        answer: "Yes, in season. Call or WhatsApp us with the variety and quantity and we will quote you.",
        seasons: [],
    },
    {
        key: "chemicals",
        question: "Are your mangoes ripened with chemicals?",
        answer: "No. No formalin, no carbide, no ripening spray. We wait for the fruit to ripen on the tree before picking.",
        seasons: ["mango", "all"],
    },
    {
        key: "gur-pure",
        question: "Is your gur made with sugar?",
        answer: "No. The sap is boiled down over a wood fire with no sugar and no hydros, which is why it is a little darker than market gur.",
        seasons: ["winter", "all"],
    },
];
