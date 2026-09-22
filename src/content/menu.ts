/** Menu data — §5.2. Prices are strings so they render exactly as printed. */

export type SizedItem = { name: string; prices: [string, string]; featured?: boolean; group?: string };
export type SizedTable = { id: string; title: string; sizes: [string, string]; items: SizedItem[] };
export type SimpleItem = { name: string; price: string };

export const sizedTables: SizedTable[] = [
  {
    id: "hot",
    title: "Hot",
    sizes: ["12 oz", "16 oz"],
    items: [
      { name: "House Coffee", prices: ["2.79", "3.19"] },
      { name: "Hot Tea", prices: ["2.99", "3.21"] },
      { name: "Hot Chocolate", prices: ["2.99", "3.51"] },
      { name: "Americano", prices: ["3.51", "4.21"] },
      { name: "Macchiato", prices: ["3.79", "4.51"] },
      { name: "Flat White", prices: ["4.19", "5.51"] },
      { name: "Latte", prices: ["4.79", "5.81"] },
      { name: "Golden Chai Tea", prices: ["5.07", "6.21"], featured: true, group: "Hot" },
      { name: "London Fog", prices: ["5.79", "6.51"] },
    ],
  },
  {
    id: "cold",
    title: "Cold",
    sizes: ["16 oz", "20 oz"],
    items: [
      { name: "Iced Coffee", prices: ["2.79", "3.19"] },
      { name: "Iced Tea", prices: ["2.79", "3.19"] },
      { name: "Lemonade", prices: ["2.99", "3.41"] },
      { name: "Cold Cream Espresso", prices: ["3.19", "4.21"] },
      { name: "Yogurt Blend", prices: ["4.21", "5.19"] },
      { name: "Banana Blend", prices: ["5.19", "6.21"] },
      { name: "Berry Blend", prices: ["5.19", "6.21"] },
      { name: "Protein Shake", prices: ["5.51", "6.53"] },
      { name: "Organic Spice Blend", prices: ["6.21", "7.51"] },
    ],
  },
];

/** House signatures — drinks named for Greenwood figures. */
export type Signature = { name: string; story?: string };
export type SignatureGroup = {
  group: string;
  prices: [{ size: string; price: string }, { size: string; price: string }];
  drinks: Signature[];
};

export const signatureGroups: SignatureGroup[] = [
  {
    group: "The People's Choice",
    prices: [
      { size: "16 oz", price: "$3.19" },
      { size: "20 oz", price: "$4.21" },
    ],
    drinks: [{ name: "Rosa Parks" }, { name: "Purple Rain" }, { name: "Halle Berry" }, { name: "Love Potion" }],
  },
  {
    group: "Blended Beverages",
    prices: [
      { size: "16 oz", price: "$6.19" },
      { size: "20 oz", price: "$7.21" },
    ],
    drinks: [{ name: "Dot Miller" }, { name: "Aunt Lucielle" }, { name: "Marilyn Kay" }, { name: "Tootie Tonic" }],
  },
  {
    group: "Frozen Whip Appeal",
    prices: [
      { size: "16 oz", price: "$5.19" },
      { size: "20 oz", price: "$6.21" },
    ],
    drinks: [{ name: "Loula Williams" }, { name: "OW Gurley" }, { name: "GAP Frap" }, { name: "Big Mama" }],
  },
  {
    group: "Organic Tea Tonics",
    prices: [
      { size: "16 oz", price: "$7.19" },
      { size: "20 oz", price: "$8.21" },
    ],
    drinks: [{ name: "Peg Leg Power" }, { name: "Ole JB" }, { name: "Aunt Jobie" }, { name: "High Baller" }],
  },
];

export const espresso: SimpleItem[] = [
  { name: "Single shot", price: "$1.99" },
  { name: "Double shot", price: "$2.79" },
  { name: "Triple shot", price: "$3.59" },
  { name: "Cappuccino, 6 oz", price: "$1.99" },
  { name: "Cappuccino, 8 oz", price: "$3.59" },
];

export const food: SimpleItem[] = [
  { name: "Muffins", price: "$2.79" },
  { name: "Honey Butter Croissant", price: "$3.19" },
  { name: "Bagel with Cream Cheese", price: "$3.79" },
  { name: "Sweet Treat of the Day", price: "$4.21" },
];

export const flavorShots = {
  price: "$1.21 per additional shot",
  groups: [
    {
      label: "Coffee & espresso",
      items: "Caramel · Chai · Cinnamon · Hazelnut · Maple · Matcha · Mocha · Pistachio · Vanilla · White Chocolate",
    },
    {
      label: "Teas, lemonades & sparkling",
      items: "Hibiscus · Ginger · Lavender · Lemon · Lime · Pomegranate · Raspberry · Rose · Watermelon",
    },
  ],
};

/** Home-page teaser rows — name · group · smallest-size price. */
export const featuredItems: { name: string; group: string; price: string }[] = [
  { name: "Loula Williams", group: "Frozen Whip Appeal", price: "$5.19" },
  { name: "OW Gurley", group: "Frozen Whip Appeal", price: "$5.19" },
  { name: "Rosa Parks", group: "The People's Choice", price: "$3.19" },
  { name: "Aunt Lucielle", group: "Blended Beverage", price: "$6.19" },
  { name: "Peg Leg Power", group: "Organic Tea Tonic", price: "$7.19" },
  { name: "Golden Chai Tea", group: "Hot", price: "$5.07" },
];

export const menuSections = [
  { id: "coffee", label: "Coffee & tea" },
  { id: "signatures", label: "House signatures" },
  { id: "espresso", label: "Espresso" },
  { id: "food", label: "Food" },
  { id: "flavors", label: "Flavor shots" },
];
