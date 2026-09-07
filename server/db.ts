import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface UserRecord {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  privacyPinHash: string;
  role: 'customer' | 'admin';
  createdAt: string;
}

export interface CustomerProfileRecord {
  userId: string;
  address: string;
  landmark?: string;
  deliveryArea: string;
  notes?: string;
  totalOrders: number;
}

export interface AdminUserRecord {
  id: string;
  username: string;
  phone: string;
  passwordHash: string;
  pinHash: string;
  name: string;
  role: 'super_admin' | 'manager';
}

export interface MenuCategoryRecord {
  id: string;
  name: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
}

export interface MenuItemRecord {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isVeg: boolean;
  isAvailable: boolean;
  prepTimeMinutes: number;
  sortOrder: number;
}

export interface OrderItemRecord {
  id: string;
  orderId: string;
  itemId: string;
  itemName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryArea: string;
  deliveryDistanceKm: number;
  foodTotal: number;
  deliveryCharge: number;
  grandTotal: number;
  paymentMethod: 'Cash on Delivery';
  status:
    | 'Order Placed'
    | 'Accepted'
    | 'Preparing'
    | 'Ready'
    | 'Out for Delivery'
    | 'Delivered'
    | 'Order Rejected';
  estimatedPrepTimeMinutes: number;
  specialInstructions?: string;
  items: OrderItemRecord[];
  customerLatitude?: number;
  customerLongitude?: number;
  googleMapsUrl?: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  readyAt?: string;
  deliveredAt?: string;
}

export interface DeliveryAreaRecord {
  id: string;
  name: string;
  distanceKm: number;
  isActive: boolean;
}

export interface DeliverySettingsRecord {
  freeDeliveryKm: number;
  perKmCharge: number;
  minOrderAmount: number;
  isRestaurantOpen: boolean;
  defaultPrepTimeMinutes: number;
  contactPhones: string[];
  restaurantAddress: string;
}

export interface RestaurantProfileRecord {
  name: string;
  tagline: string;
  description: string;
  logoUrl: string;
  coverPhotoUrl: string;
  address: string;
  landmark?: string;
  phones: string[];
  fssaiNumber?: string;
  openingHours: string;
  isOnlineOrderOpen: boolean;
}

export interface DatabaseData {
  users: UserRecord[];
  customerProfiles: CustomerProfileRecord[];
  adminUsers: AdminUserRecord[];
  menuCategories: MenuCategoryRecord[];
  menuItems: MenuItemRecord[];
  orders: OrderRecord[];
  deliveryAreas: DeliveryAreaRecord[];
  deliverySettings: DeliverySettingsRecord;
  restaurantProfile?: RestaurantProfileRecord;
  nextOrderSequence: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'hotel_malabar.json');

// Helper to calculate delivery charge
export function calculateDeliveryFee(distanceKm: number, settings: DeliverySettingsRecord): number {
  if (distanceKm <= settings.freeDeliveryKm) {
    return 0;
  }
  const extraKm = Math.ceil(distanceKm - settings.freeDeliveryKm);
  return extraKm * settings.perKmCharge;
}

export const AUTHORIZED_ADMIN_PHONES = ['9567562071', '8904634717', '9538950224'] as const;
export type AuthorizedAdminPhone = (typeof AUTHORIZED_ADMIN_PHONES)[number];

class CentralDatabase {
  private data: DatabaseData;

  constructor() {
    this.data = this.loadOrInitialize();
  }

  private ensureAuthorizedAdmins(data: DatabaseData): void {
    if (!Array.isArray(data.adminUsers)) {
      data.adminUsers = [];
    }

    // Strictly enforce that ONLY the three authorized admin phone numbers exist as admins
    data.adminUsers = data.adminUsers.filter((a) =>
      AUTHORIZED_ADMIN_PHONES.includes(a.phone as any)
    );

    const defaultAdminPassHash = bcrypt.hashSync('MalabarAdmin@2026', 10);
    const defaultPinHash = bcrypt.hashSync('1985', 10);

    const adminDetails: Record<string, { name: string; username: string }> = {
      '9567562071': { name: 'Hotel Malabar Lead Admin', username: 'admin_9567562071' },
      '8904634717': { name: 'Hotel Malabar Operations Admin', username: 'admin_8904634717' },
      '9538950224': { name: 'Hotel Malabar Staff Admin', username: 'admin_9538950224' },
    };

    for (const phone of AUTHORIZED_ADMIN_PHONES) {
      const existing = data.adminUsers.find((a) => a.phone === phone);
      if (!existing) {
        data.adminUsers.push({
          id: `admin_${phone}`,
          username: adminDetails[phone]?.username || `admin_${phone}`,
          phone,
          passwordHash: defaultAdminPassHash,
          pinHash: defaultPinHash,
          name: adminDetails[phone]?.name || 'Hotel Malabar Admin',
          role: 'super_admin',
        });
      }
    }
  }

  private loadOrInitialize(): DatabaseData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed.restaurantProfile) {
          parsed.restaurantProfile = this.getDefaultRestaurantProfile();
        }
        this.ensureAuthorizedAdmins(parsed);
        this.saveData(parsed);
        return parsed;
      }
    } catch (err) {
      console.error('Error reading database file, initializing defaults:', err);
    }

    const initial = this.getInitialData();
    this.ensureAuthorizedAdmins(initial);
    this.saveData(initial);
    return initial;
  }

  private saveData(data: DatabaseData) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to persist database file:', err);
    }
  }

  private persist() {
    this.saveData(this.data);
  }

  private getInitialData(): DatabaseData {
    const adminPassHash = bcrypt.hashSync('MalabarAdmin@2026', 10);
    const adminPinHash = bcrypt.hashSync('1985', 10);

    const categories: MenuCategoryRecord[] = [
      { id: 'cat_breakfast', name: 'Breakfast', icon: 'Sun', displayOrder: 1, isActive: true },
      { id: 'cat_biryani', name: 'Biryani', icon: 'Flame', displayOrder: 2, isActive: true },
      { id: 'cat_roti', name: 'Roti Items', icon: 'Disc', displayOrder: 3, isActive: true },
      { id: 'cat_meals', name: 'Meals', icon: 'Utensils', displayOrder: 4, isActive: true },
      { id: 'cat_seafood', name: 'Sea Food', icon: 'Fish', displayOrder: 5, isActive: true },
      { id: 'cat_grill', name: 'Grill & Shawarma', icon: 'Flame', displayOrder: 6, isActive: true },
      { id: 'cat_nonveg_curry', name: 'Non Veg Curry', icon: 'Soup', displayOrder: 7, isActive: true },
      { id: 'cat_veg_curry', name: 'Veg Curry', icon: 'Salad', displayOrder: 8, isActive: true },
      { id: 'cat_nonveg_starters', name: 'Non Veg Starters', icon: 'Drumstick', displayOrder: 9, isActive: true },
      { id: 'cat_veg_starters', name: 'Veg Starters', icon: 'Carrot', displayOrder: 10, isActive: true },
      { id: 'cat_egg', name: 'Egg Items', icon: 'Egg', displayOrder: 11, isActive: true },
      { id: 'cat_tandoori', name: 'Tandoori', icon: 'Sparkles', displayOrder: 12, isActive: true },
      { id: 'cat_chinese_rice', name: 'Chinese Rice', icon: 'Wheat', displayOrder: 13, isActive: true },
      { id: 'cat_noodles', name: 'Noodles', icon: 'UtensilsCrossed', displayOrder: 14, isActive: true },
      { id: 'cat_soup', name: 'Chinese Soup', icon: 'Soup', displayOrder: 15, isActive: true },
      { id: 'cat_rice', name: 'Rice', icon: 'Wheat', displayOrder: 16, isActive: true },
      { id: 'cat_tea_coffee', name: 'Tea / Coffee', icon: 'Coffee', displayOrder: 17, isActive: true },
      { id: 'cat_mojitos', name: 'Mojitos', icon: 'GlassWater', displayOrder: 18, isActive: true },
      { id: 'cat_milkshakes', name: 'Milk Shake', icon: 'Milk', displayOrder: 19, isActive: true },
      { id: 'cat_fresh_juice', name: 'Fresh Juice', icon: 'Citrus', displayOrder: 20, isActive: true },
      { id: 'cat_lassi_falooda', name: 'Lassi & Falooda', icon: 'IceCream2', displayOrder: 21, isActive: true },
            { id: 'cat_desserts', name: 'Desserts', icon: 'Cake', displayOrder: 22, isActive: true },
    ];

    const menuItems: MenuItemRecord[] = [
      // 1. Breakfast
      {
        id: 'item_b1',
        categoryId: 'cat_breakfast',
        name: 'Malabar Porotta with Chicken Roast',
        description: 'Two flaky layered Kerala porottas served with rich, aromatic Kerala style chicken roast cooked in coconut oil and curry leaves.',
        price: 180,
        imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 1,
      },
      {
        id: 'item_b2',
        categoryId: 'cat_breakfast',
        name: 'Kerala Appam with Vegetable Stew',
        description: 'Fluffy fermented rice and coconut hopper with soft center and lacy edges, paired with mildly spiced coconut milk vegetable stew.',
        price: 130,
        imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 2,
      },
      {
        id: 'item_b3',
        categoryId: 'cat_breakfast',
        name: 'Malabar Ghee Roast Dosa',
        description: 'Crispy golden crepe roasted in pure Desi ghee, served with Malabar style sambar and trio of traditional chutneys.',
        price: 110,
        imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 8,
        sortOrder: 3,
      },
      {
        id: 'item_b4',
        categoryId: 'cat_breakfast',
        name: 'Puttu with Kadala Curry',
        description: 'Steamed cylindrical ground rice layered with fresh grated coconut, accompanied by traditional spicy black chickpea curry.',
        price: 120,
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 4,
      },

      // 2. Biryani
      {
        id: 'item_bir1',
        categoryId: 'cat_biryani',
        name: 'Hotel Malabar Special Dum Chicken Biryani',
        description: 'Authentic Thalassery / Malabar Biryani prepared with premium fragrant Kaima (Jeerakasala) rice, tender chicken, caramelized onions, cashew nuts, raisins and Malabar spices sealed and slow-cooked in dum.',
        price: 240,
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 1,
      },
      {
        id: 'item_bir2',
        categoryId: 'cat_biryani',
        name: 'Malabar Mutton Dum Biryani',
        description: 'Slow-cooked young goat meat infused in rich Malabar masala and layered with aromatic Jeerakasala ghee rice, served with date pickle, raita and pappadam.',
        price: 330,
        imageUrl: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 12,
        sortOrder: 2,
      },
      {
        id: 'item_bir3',
        categoryId: 'cat_biryani',
        name: 'Malabar Beef Dum Biryani',
        description: 'Tender beef chunks slow-simmered in roasted coriander and pepper gravy, layered with dum Kaima rice, served with traditional accompaniments.',
        price: 260,
        imageUrl: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 3,
      },
            {
        id: 'item_bir4',
        categoryId: 'cat_biryani',
        name: 'Malabar Fish Biryani',
        description: 'Fresh seer fish marinated in Malabar spices and layered with fragrant Kaima rice, caramelized onions, cashews and raisins.',
        price: 290,
        imageUrl: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 12,
        sortOrder: 4,
      },
      {
        id: 'item_bir5',
        categoryId: 'cat_biryani',
        name: 'Malabar Egg Biryani',
        description: 'Fragrant Jeerakasala rice cooked with aromatic Malabar spices and boiled eggs, served with raita and pickle.',
        price: 170,
        imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 8,
        sortOrder: 5,
      },
      {
        id: 'item_bir6',
        categoryId: 'cat_biryani',
        name: 'Veg Dum Biryani',
        description: 'Seasonal vegetables and aromatic spices slow-cooked with fragrant Kaima rice, garnished with fried onions and cashews.',
        price: 160,
        imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 6,
      },

      // 3. Roti Items
      {
        id: 'item_r1',
        categoryId: 'cat_roti',
        name: 'Malabar Porotta',
        description: 'Classic flaky, layered Kerala flatbread prepared with refined flour and hand-stretched for the perfect texture.',
        price: 25,
        imageUrl: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 5,
        sortOrder: 1,
      },
      {
        id: 'item_r2',
        categoryId: 'cat_roti',
        name: 'Wheat Chapathi',
        description: 'Soft and healthy whole wheat Indian flatbread cooked fresh on the tawa.',
        price: 20,
        imageUrl: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 5,
        sortOrder: 2,
      },
      {
        id: 'item_r3',
        categoryId: 'cat_roti',
        name: 'Butter Naan',
        description: 'Soft tandoor-baked Indian flatbread brushed generously with melted butter.',
        price: 45,
        imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 7,
        sortOrder: 3,
      },
      {
        id: 'item_r4',
        categoryId: 'cat_roti',
        name: 'Garlic Naan',
        description: 'Tandoor-baked naan topped with fresh garlic, coriander and butter.',
        price: 55,
        imageUrl: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 7,
        sortOrder: 4,
      },
            {
        id: 'item_r5',
        categoryId: 'cat_roti',
        name: 'Tandoori Roti',
        description: 'Traditional whole wheat flatbread baked in a hot clay tandoor for a smoky, rustic flavour.',
        price: 30,
        imageUrl: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 6,
        sortOrder: 5,
      },

      // 4. Meals
      {
        id: 'item_m1',
        categoryId: 'cat_meals',
        name: 'Kerala Meals',
        description: 'Traditional Kerala vegetarian meals served with rice, sambar, avial, thoran, olan, pachadi, pickle and pappadam.',
        price: 150,
        imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 1,
      },
      {
        id: 'item_m2',
        categoryId: 'cat_meals',
        name: 'Fish Curry Meals',
        description: 'Kerala meals served with steamed rice and authentic spicy Malabar fish curry with traditional side dishes.',
        price: 220,
        imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 12,
        sortOrder: 2,
      },
      {
        id: 'item_m3',
        categoryId: 'cat_meals',
        name: 'Chicken Curry Meals',
        description: 'Full Kerala meals accompanied by aromatic Malabar chicken curry and traditional vegetarian side dishes.',
        price: 210,
        imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 12,
        sortOrder: 3,
      },

      // 5. Sea Food
      {
        id: 'item_s1',
        categoryId: 'cat_seafood',
        name: 'Malabar Fish Fry',
        description: 'Fresh seer fish marinated in a fiery blend of Kashmiri chilli, pepper, ginger, garlic and curry leaves, shallow-fried to perfection.',
        price: 180,
        imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 15,
        sortOrder: 1,
      },
      {
        id: 'item_s2',
        categoryId: 'cat_seafood',
        name: 'Malabar Fish Curry',
        description: 'Fresh fish cooked in authentic Kerala style with roasted coconut, tamarind, shallots and aromatic spices.',
        price: 190,
        imageUrl: 'https://images.unsplash.com/photo-1534766555764-ce878a5e3a2b?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 15,
        sortOrder: 2,
      },
      {
        id: 'item_s3',
        categoryId: 'cat_seafood',
        name: 'Prawns Masala',
        description: 'Juicy tiger prawns cooked with onions, tomatoes, green chillies and a special Malabar spice blend.',
        price: 280,
        imageUrl: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 18,
        sortOrder: 3,
      },
      {
        id: 'item_s4',
        categoryId: 'cat_seafood',
        name: 'Squid Roast',
        description: 'Tender squid rings roasted with coconut, curry leaves, black pepper and traditional Kerala spices.',
        price: 260,
        imageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 18,
        sortOrder: 4,
      },
            {
        id: 'item_s5',
        categoryId: 'cat_seafood',
        name: 'Chilli Garlic Prawns',
        description: 'Succulent prawns tossed with fresh garlic, green chillies, onions and a spicy Asian-inspired sauce.',
        price: 290,
        imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 15,
        sortOrder: 5,
      },

      // 6. Grill & Shawarma
      {
        id: 'item_g1',
        categoryId: 'cat_grill',
        name: 'Tandoori Chicken Half',
        description: 'Half chicken marinated overnight in yogurt and aromatic spices, char-grilled in a traditional clay tandoor.',
        price: 260,
        imageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 20,
        sortOrder: 1,
      },
      {
        id: 'item_g2',
        categoryId: 'cat_grill',
        name: 'Chicken Shawarma Roll',
        description: 'Juicy grilled chicken, fresh vegetables, garlic sauce and pickled cucumbers wrapped in soft Arabic bread.',
        price: 130,
        imageUrl: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 2,
      },
      {
        id: 'item_g3',
        categoryId: 'cat_grill',
        name: 'Grilled Chicken Full',
        description: 'Whole chicken marinated with special Malabar spices and grilled over charcoal for a smoky, juicy finish.',
        price: 520,
        imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 30,
        sortOrder: 3,
      },
      {
        id: 'item_g4',
        categoryId: 'cat_grill',
        name: 'Chicken Tikka',
        description: 'Tender boneless chicken pieces marinated in yogurt and spices, skewered and cooked in the tandoor.',
        price: 220,
        imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 18,
        sortOrder: 4,
      },
      {
        id: 'item_g5',
        categoryId: 'cat_grill',
        name: 'Chicken Seekh Kebab',
        description: 'Minced chicken blended with fresh herbs and aromatic spices, skewered and char-grilled.',
        price: 230,
        imageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 18,
        sortOrder: 5,
      },

      // 7. Non Veg Curry
      {
        id: 'item_nvc1',
        categoryId: 'cat_nonveg_curry',
        name: 'Malabar Chicken Curry',
        description: 'Classic Kerala chicken curry cooked with roasted coconut, shallots, curry leaves and a fragrant blend of Malabar spices.',
        price: 190,
        imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 15,
        sortOrder: 1,
      },
      {
        id: 'item_nvc2',
        categoryId: 'cat_nonveg_curry',
        name: 'Malabar Beef Curry',
        description: 'Tender beef slow-cooked with roasted coconut, black pepper, coriander and traditional Malabar spices.',
        price: 230,
        imageUrl: 'https://images.unsplash.com/photo-1545247181-516773cae754?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 20,
        sortOrder: 2,
      },
      {
        id: 'item_nvc3',
        categoryId: 'cat_nonveg_curry',
        name: 'Mutton Curry',
        description: 'Tender mutton pieces slow-cooked in a rich onion and tomato gravy with aromatic whole spices.',
        price: 290,
        imageUrl: 'https://images.unsplash.com/photo-1545247181-516773cae754?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 25,
        sortOrder: 3,
      },
            {
        id: 'item_nvc4',
        categoryId: 'cat_nonveg_curry',
        name: 'Egg Curry',
        description: 'Boiled eggs simmered in a creamy coconut and onion gravy with traditional Kerala spices.',
        price: 120,
        imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 4,
      },

      // 8. Veg Curry
      {
        id: 'item_vc1',
        categoryId: 'cat_veg_curry',
        name: 'Kerala Vegetable Curry',
        description: 'Fresh seasonal vegetables cooked in a mild coconut-based Kerala gravy with curry leaves.',
        price: 110,
        imageUrl: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 12,
        sortOrder: 1,
      },
      {
        id: 'item_vc2',
        categoryId: 'cat_veg_curry',
        name: 'Paneer Butter Masala',
        description: 'Soft paneer cubes cooked in a rich, creamy tomato and butter gravy with aromatic Indian spices.',
        price: 180,
        imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 15,
        sortOrder: 2,
      },
      {
        id: 'item_vc3',
        categoryId: 'cat_veg_curry',
        name: 'Dal Tadka',
        description: 'Yellow lentils tempered with garlic, cumin, dried chillies and ghee.',
        price: 120,
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 3,
      },

      // 9. Non Veg Starters
      {
        id: 'item_nvs1',
        categoryId: 'cat_nonveg_starters',
        name: 'Chicken 65',
        description: 'Crispy deep-fried chicken pieces marinated in a spicy blend of red chilli, ginger, garlic and curry leaves.',
        price: 190,
        imageUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 15,
        sortOrder: 1,
      },
      {
        id: 'item_nvs2',
        categoryId: 'cat_nonveg_starters',
        name: 'Chicken Pepper Fry',
        description: 'Boneless chicken tossed with crushed black pepper, onions, green chillies and curry leaves.',
        price: 210,
        imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
              {
        id: 'item_nvs5',
        categoryId: 'cat_nonveg_starters',
        name: 'Mutton Pepper Fry',
        description: 'Tender mutton pieces roasted with black pepper, shallots, curry leaves and aromatic Malabar spices.',
        price: 290,
        imageUrl: 'https://images.unsplash.com/photo-1545247181-516773cae754?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 20,
        sortOrder: 5,
      },

      // 10. Veg Starters
      {
        id: 'item_vs1',
        categoryId: 'cat_veg_starters',
        name: 'Gobi Manchurian',
        description: 'Crispy cauliflower florets tossed in a tangy Indo-Chinese Manchurian sauce with spring onions.',
        price: 150,
        imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 15,
        sortOrder: 1,
      },
      {
        id: 'item_vs2',
        categoryId: 'cat_veg_starters',
        name: 'Paneer 65',
        description: 'Crispy paneer cubes marinated in spicy South Indian masala and fried until golden.',
        price: 180,
        imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 15,
        sortOrder: 2,
      },
      {
        id: 'item_vs3',
        categoryId: 'cat_veg_starters',
        name: 'Crispy Corn',
        description: 'Golden sweet corn kernels coated with spices and fried until perfectly crisp.',
        price: 140,
        imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 12,
        sortOrder: 3,
      },

      // 11. Egg Items
      {
        id: 'item_e1',
        categoryId: 'cat_egg',
        name: 'Egg Omelette',
        description: 'Two eggs beaten with onions, green chillies, coriander and spices, cooked fresh on the tawa.',
        price: 60,
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable:
                // 12. Tandoori
      {
        id: 'item_t1',
        categoryId: 'cat_tandoori',
        name: 'Tandoori Chicken Full',
        description: 'Whole chicken marinated in yogurt, lemon and aromatic tandoori spices, then roasted in a traditional clay oven.',
        price: 480,
        imageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 30,
        sortOrder: 1,
      },
      {
        id: 'item_t2',
        categoryId: 'cat_tandoori',
        name: 'Tandoori Chicken Half',
        description: 'Half chicken marinated in yogurt and traditional tandoori spices, roasted until smoky and tender.',
        price: 260,
        imageUrl: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 20,
        sortOrder: 2,
      },
      {
        id: 'item_t3',
        categoryId: 'cat_tandoori',
        name: 'Chicken Tikka',
        description: 'Boneless chicken pieces marinated with yogurt and spices, skewered and roasted in the tandoor.',
        price: 220,
        imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 18,
        sortOrder: 3,
      },
      {
        id: 'item_t4',
        categoryId: 'cat_tandoori',
        name: 'Paneer Tikka',
        description: 'Soft paneer cubes marinated in spiced yogurt with onions and capsicum, grilled in the tandoor.',
        price: 200,
        imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 18,
        sortOrder: 4,
      },

      // 13. Chinese Rice
      {
        id: 'item_cr1',
        categoryId: 'cat_chinese_rice',
        name: 'Chicken Fried Rice',
        description: 'Fragrant basmati rice wok-tossed with tender chicken, eggs, vegetables, spring onions and Chinese sauces.',
        price: 180,
        imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 12,
        sortOrder: 1,
      },
      {
        id: 'item_cr2',
        categoryId: 'cat_chinese_rice',
        name: 'Veg Fried Rice',
        description: 'Wok-tossed fragrant rice with fresh vegetables, spring onions and light Chinese seasoning.',
        price: 140,
        imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 2,
      },
      {
        id: 'item_cr3',
        categoryId: 'cat_chinese_rice',
        name: 'Schezwan Chicken Fried Rice',
        description: 'Spicy wok-fried rice with chicken, vegetables and bold Schezwan chilli sauce.',
        price: 200,
        imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 12,
        sortOrder: 3,
      },
      {
        id: 'item_cr4',
        categoryId: 'cat_chinese_rice',
        name: 'Egg Fried Rice',
        description: 'Wok-tossed rice with scrambled eggs, vegetables, spring onions and aromatic Chinese seasoning.',
        price: 160,
        imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 4,
      },
            // 14. Noodles
      {
        id: 'item_n1',
        categoryId: 'cat_noodles',
        name: 'Chicken Noodles',
        description: 'Wok-tossed noodles with tender chicken, fresh vegetables, spring onions and Chinese sauces.',
        price: 170,
        imageUrl: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 12,
        sortOrder: 1,
      },
      {
        id: 'item_n2',
        categoryId: 'cat_noodles',
        name: 'Veg Noodles',
        description: 'Fresh noodles tossed with crunchy vegetables, spring onions and light Chinese seasoning.',
        price: 140,
        imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 2,
      },
      {
        id: 'item_n3',
        categoryId: 'cat_noodles',
        name: 'Schezwan Chicken Noodles',
        description: 'Spicy noodles tossed with chicken, vegetables and fiery Schezwan sauce.',
        price: 190,
        imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 12,
        sortOrder: 3,
      },

      // 15. Chinese Soup
      {
        id: 'item_soup1',
        categoryId: 'cat_soup',
        name: 'Chicken Manchow Soup',
        description: 'Spicy and tangy chicken soup with vegetables, herbs and crispy fried noodles.',
        price: 120,
        imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 1,
      },
      {
        id: 'item_soup2',
        categoryId: 'cat_soup',
        name: 'Chicken Clear Soup',
        description: 'Light and comforting clear chicken broth with fresh vegetables and herbs.',
        price: 110,
        imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 2,
      },
      {
        id: 'item_soup3',
        categoryId: 'cat_soup',
        name: 'Veg Manchow Soup',
        description: 'Hot and spicy vegetable soup topped with crispy fried noodles and spring onions.',
        price: 100,
        imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 3,
      },

      // 16. Rice
      {
        id: 'item_rice1',
        categoryId: 'cat_rice',
        name: 'Ghee Rice',
        description: 'Fragrant basmati rice cooked with pure ghee, cashews and aromatic whole spices.',
        price: 130,
        imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 1,
      },
      {
        id: 'item_rice2',
        categoryId: 'cat_rice',
        name: 'Jeera Rice',
        description: 'Long-grain basmati rice tempered with cumin seeds and fragrant spices.',
        price: 120,
        imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 10,
        sortOrder: 2,
      },
      {
        id: 'item_rice3',
        categoryId: 'cat_rice',
        name: 'Plain Rice',
        description: 'Freshly steamed fluffy rice, perfect with Kerala curries and side dishes.',
        price: 80,
        imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 5,
        sortOrder: 3,
      },
            // 17. Tea / Coffee
      {
        id: 'item_tc1',
        categoryId: 'cat_tea_coffee',
        name: 'Kerala Tea',
        description: 'Freshly brewed strong tea with milk and sugar.',
        price: 20,
        imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 5,
        sortOrder: 1,
      },
      {
        id: 'item_tc2',
        categoryId: 'cat_tea_coffee',
        name: 'Special Tea',
        description: 'Creamy, aromatic special tea prepared with a richer blend of tea and milk.',
        price: 30,
        imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 5,
        sortOrder: 2,
      },
      {
        id: 'item_tc3',
        categoryId: 'cat_tea_coffee',
        name: 'Filter Coffee',
        description: 'Traditional South Indian filter coffee made with freshly brewed coffee decoction and hot milk.',
        price: 35,
        imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 5,
        sortOrder: 3,
      },
      {
        id: 'item_tc4',
        categoryId: 'cat_tea_coffee',
        name: 'Black Tea',
        description: 'Refreshing black tea brewed with premium tea leaves.',
        price: 20,
        imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 5,
        sortOrder: 4,
      },

      // 18. Mojitos
      {
        id: 'item_moj1',
        categoryId: 'cat_mojitos',
        name: 'Virgin Mint Mojito',
        description: 'Refreshing combination of fresh mint, lime, sugar syrup and chilled soda.',
        price: 100,
        imageUrl: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 5,
        sortOrder: 1,
      },
      {
        id: 'item_moj2',
        categoryId: 'cat_mojitos',
        name: 'Blue Lagoon Mojito',
        description: 'Cool and refreshing blue citrus mocktail with mint, lime and soda.',
        price: 120,
        imageUrl: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 5,
        sortOrder: 2,
      },
      {
        id: 'item_moj3',
        categoryId: 'cat_mojitos',
        name: 'Green Apple Mojito',
        description: 'Sweet and tangy green apple mocktail with fresh mint, lime and sparkling soda.',
        price: 120,
        imageUrl: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 5,
        sortOrder: 3,
      },

      // 19. Milk Shake
      {
        id: 'item_ms1',
        categoryId: 'cat_milkshakes',
        name: 'Chocolate Milkshake',
        description: 'Rich and creamy chocolate milkshake made with premium cocoa and chilled milk.',
        price: 130,
        imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 7,
        sortOrder: 1,
      },
      {
        id: 'item_ms2',
        categoryId: 'cat_milkshakes',
        name: 'Oreo Milkshake',
        description: 'Creamy vanilla milkshake blended with crunchy Oreo cookies and topped with whipped cream.',
        price: 150,
        imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 7,
        sortOrder: 2,
      },
      {
        id: 'item_ms3',
        categoryId: 'cat_milkshakes',
        name: 'Mango Milkshake',
        description: 'Thick and creamy seasonal mango milkshake made with fresh ripe mangoes.',
        price: 140,
        imageUrl: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 7,
        sortOrder: 3,
      },
            // 20. Fresh Juice
      {
        id: 'item_fj1',
        categoryId: 'cat_fresh_juice',
        name: 'Fresh Pomegranate (Anar) Juice',
        description: 'Freshly cold-pressed ruby pomegranate seeds without artificial sugar or preservatives.',
        price: 110,
        imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 5,
        sortOrder: 1,
      },
      {
        id: 'item_fj2',
        categoryId: 'cat_fresh_juice',
        name: 'Fresh Sweet Lime (Mosambi) Juice',
        description: 'Pure sweet lime juice with a pinch of black salt.',
        price: 80,
        imageUrl: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 5,
        sortOrder: 2,
      },

      // 21. Lassi & Falooda
      {
        id: 'item_lf1',
        categoryId: 'cat_lassi_falooda',
        name: 'Royal Malabar Falooda',
        description: 'Layered delight of rose syrup, soaked basil seeds (sabja), falooda sev, fresh seasonal cut fruits, jelly, double scoop ice cream and dry fruits.',
        price: 160,
        imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 6,
        sortOrder: 1,
      },
      {
        id: 'item_lf2',
        categoryId: 'cat_lassi_falooda',
        name: 'Sweet Lassi',
        description: 'Thick creamy yogurt blended with sugar and chilled to perfection.',
        price: 80,
        imageUrl: 'https://images.unsplash.com/photo-1571167530149-cd5d3b8f7e3e?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 5,
        sortOrder: 2,
      },
            // 22. Desserts
      {
        id: 'item_des1',
        categoryId: 'cat_desserts',
        name: 'Malabar Caramel Custard',
        description: 'Silky smooth egg and milk custard baked with golden caramel glaze.',
        price: 90,
        imageUrl: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        prepTimeMinutes: 4,
        sortOrder: 1,
      },
      {
        id: 'item_des2',
        categoryId: 'cat_desserts',
        name: 'Malabar Tender Coconut Pudding',
        description: 'Melt-in-mouth chilled dessert crafted with fresh tender coconut water and coconut malai.',
        price: 110,
        imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        prepTimeMinutes: 4,
        sortOrder: 2,
      },
    ];

    const deliveryAreas: DeliveryAreaRecord[] = [
      { id: 'area_1', name: 'Bommasandra', distanceKm: 1.5, isActive: true },
      { id: 'area_2', name: 'Yarandahalli', distanceKm: 2.8, isActive: true },
      { id: 'area_3', name: 'Jigani', distanceKm: 4.2, isActive: true },
      { id: 'area_4', name: 'Electronic City', distanceKm: 3.5, isActive: true },
      { id: 'area_5', name: 'Nearby surrounding areas', distanceKm: 2.0, isActive: true },
    ];

    const deliverySettings: DeliverySettingsRecord = {
      freeDeliveryKm: 2.0,
      perKmCharge: 50,
      minOrderAmount: 200,
      isRestaurantOpen: true,
      defaultPrepTimeMinutes: 10,
      contactPhones: ['9567562071', '8904634717', '9538950224'],
      restaurantAddress: 'Hotel Malabar, Main Road, Near Bommasandra & Electronic City, Bangalore, Karnataka - 560099',
    };

    return {
      users: [],
      customerProfiles: [],
      adminUsers: [
        {
          id: 'admin_1',
          username: 'admin',
          phone: '9567562071',
          passwordHash: adminPassHash,
          pinHash: adminPinHash,
          name: 'Hotel Malabar Manager',
          role: 'super_admin',
        },
      ],
      menuCategories: categories,
      menuItems,
      orders: [],
              deliveryAreas,
        deliverySettings,
        restaurantProfile: this.getDefaultRestaurantProfile(),
        nextOrderSequence: 1001,
      };
    }
  public getDefaultRestaurantProfile(): RestaurantProfileRecord {
    return {
      name: 'Hotel Malabar',
      tagline: 'Authentic Thalassery Biryani, Handcrafted Kerala Porottas & Coastal Delicacies',
      description:
        'Serving authentic Thalassery Dum Biryani, flaky Malabar Porottas, fresh coastal seafood, rich Kerala gravies, and juicy charcoal grills cooked to perfection with traditional spices.',
      logoUrl:
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
      coverPhotoUrl:
        'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=85',
      address:
        'Hotel Malabar, Main Road, Near Bus Stand, Bommasandra Industrial Area, Bangalore - 560099',
      landmark: 'Opposite Metro Station',
      phones: ['9567562071', '8904634717'],
      fssaiNumber: '11223334000555',
      openingHours: '11:00 AM - 11:30 PM (Daily)',
      isOnlineOrderOpen: true,
    };
  }

  // User Authentication & Management
  public findUserByPhone(phone: string): UserRecord | undefined {
    const cleanPhone = phone.trim();
    return this.data.users.find((u) => u.phone === cleanPhone);
  }

  public findUserById(id: string): UserRecord | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public registerCustomer(data: {
    phone: string;
    firstName: string;
    lastName: string;
    password: string;
    privacyPin: string;
  }): { user: UserRecord; profile: CustomerProfileRecord } {
    const cleanPhone = data.phone.trim();
    if (this.findUserByPhone(cleanPhone)) {
      throw new Error('Phone number is already registered. Please login.');
    }
    if (data.password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (!data.privacyPin || data.privacyPin.trim().length < 4) {
      throw new Error('Privacy PIN must be at least 4 characters/digits.');
    }
        this.persist();
    return newCat;
  }

  public updateCategory(id: string, updates: Partial<MenuCategoryRecord>): MenuCategoryRecord {
    const cat = this.data.menuCategories.find((c) => c.id === id);
    if (!cat) throw new Error('Category not found');
    Object.assign(cat, updates);
    this.persist();
    return cat;
  }

  public deleteCategory(id: string, reassignToCategoryId?: string): boolean {
    const initialLen = this.data.menuCategories.length;
    // Handle items belonging to this category
    const remainingCategories = this.data.menuCategories.filter((c) => c.id !== id);
    const fallbackCategory = reassignToCategoryId
      ? remainingCategories.find((c) => c.id === reassignToCategoryId)
      : remainingCategories[0];

    if (fallbackCategory) {
      this.data.menuItems.forEach((item) => {
        if (item.categoryId === id) {
          item.categoryId = fallbackCategory.id;
        }
      });
    } else {
      // If no categories left, delete orphaned items
      this.data.menuItems = this.data.menuItems.filter((i) => i.categoryId !== id);
    }

    this.data.menuCategories = remainingCategories;
    const deleted = this.data.menuCategories.length < initialLen;
    if (deleted) this.persist();
    return deleted;
  }

  public reorderCategories(orderedIds: string[]): MenuCategoryRecord[] {
    orderedIds.forEach((id, index) => {
      const cat = this.data.menuCategories.find((c) => c.id === id);
      if (cat) {
        cat.displayOrder = index + 1;
      }
    });
    this.persist();
    return this.getMenuCategories();
  }

  public moveCategory(id: string, direction: 'up' | 'down'): MenuCategoryRecord[] {
    const sorted = [...this.data.menuCategories].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((c) => c.id === id);
    if (idx === -1) return this.getMenuCategories();

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx >= 0 && targetIdx < sorted.length) {
      // Swap order numbers
      sorted.forEach((cat, index) => {
        cat.displayOrder = index + 1;
      });
      const current = sorted[idx];
      const target = sorted[targetIdx];
      const temp = current.displayOrder;
      current.displayOrder = target.displayOrder;
      target.displayOrder = temp;
      this.persist();
    }
    return this.getMenuCategories();
  }

  public reorderMenuItems(orderedIds: string[]): MenuItemRecord[] {
    orderedIds.forEach((id, index) => {
      const item = this.data.menuItems.find((i) => i.id === id);
      if (item) {
        item.sortOrder = index + 1;
      }
    });
    this.persist();
    return this.getMenuItems();
  }

  public moveMenuItem(id: string, direction: 'up' | 'down'): MenuItemRecord[] {
    const item = this.data.menuItems.find((i) => i.id === id);
    if (!item) return this.getMenuItems();

    const catItems = this.data.menuItems
      .filter((i) => i.categoryId === item.categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const idx = catItems.findIndex((i) => i.id === id);
    if (idx === -1) return this.getMenuItems();

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx >= 0 && targetIdx < catItems.length) {
      catItems.forEach((it, index) => {
        it.sortOrder = index + 1;
      });
      const current = catItems[idx];
      const target = catItems[targetIdx];
      const temp = current.sortOrder;
      current.sortOrder = target.sortOrder;
      target.sortOrder = temp;
      this.persist();
    }
    return this.getMenuItems();
  }

  // Restaurant Profile Management
  public getRestaurantProfile(): RestaurantProfileRecord {
    if (!this.data.restaurantProfile) {
      this.data.restaurantProfile = this.getDefaultRestaurantProfile();
      this.persist();
    }
    return this.data.restaurantProfile;
  }

  public updateRestaurantProfile(updates: Partial<RestaurantProfileRecord>): RestaurantProfileRecord {
    if (!this.data.restaurantProfile) {
      this.data.restaurantProfile = this.getDefaultRestaurantProfile();
    }
    Object.assign(this.data.restaurantProfile, updates);
    this.persist();
    return this.data.restaurantProfile;
  }

  // Orders Management
  public createOrder(data: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryArea: string;
    items: { itemId: string; quantity: number }[];
    specialInstructions?: string;
    customerLatitude?: number;
    customerLongitude?: number;
  }): OrderRecord {
    const settings = this.data.deliverySettings;
    if (!settings.isRestaurantOpen) {
      throw new Error('Hotel Malabar is currently closed for new online orders.');
    }

    const area = this.data.deliveryAreas.find((a) => a.name === data.deliveryArea) || {
      id: 'default',
      name: data.deliveryArea,
      distanceKm: 2.0,
      isActive: true,
    };

    let foodTotal = 0;
    const orderItems: OrderItemRecord[] = [];

    for (const orderItem of data.items) {
      const menuItem = this.data.menuItems.find((i) => i.id === orderItem.itemId);
      if (!menuItem) {
        throw new Error(`Item with ID ${orderItem.itemId} not found`);
      }
      if (!menuItem.isAvailable) {
        throw new Error(`"${menuItem.name}" is currently unavailable.`);
      }
      const subtotal = menuItem.price * orderItem.quantity;
          }
    return this.getMenuCategories();
  }

  public reorderMenuItems(orderedIds: string[]): MenuItemRecord[] {
    orderedIds.forEach((id, index) => {
      const item = this.data.menuItems.find((i) => i.id === id);
      if (item) {
        item.sortOrder = index + 1;
      }
    });
    this.persist();
    return this.getMenuItems();
  }

  public moveMenuItem(id: string, direction: 'up' | 'down'): MenuItemRecord[] {
    const item = this.data.menuItems.find((i) => i.id === id);
    if (!item) return this.getMenuItems();

    const catItems = this.data.menuItems
      .filter((i) => i.categoryId === item.categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const idx = catItems.findIndex((i) => i.id === id);
    if (idx === -1) return this.getMenuItems();

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx >= 0 && targetIdx < catItems.length) {
      catItems.forEach((it, index) => {
        it.sortOrder = index + 1;
      });
      const current = catItems[idx];
      const target = catItems[targetIdx];
      const temp = current.sortOrder;
      current.sortOrder = target.sortOrder;
      target.sortOrder = temp;
      this.persist();
    }
    return this.getMenuItems();
  }

  // Restaurant Profile Management
  public getRestaurantProfile(): RestaurantProfileRecord {
    if (!this.data.restaurantProfile) {
      this.data.restaurantProfile = this.getDefaultRestaurantProfile();
      this.persist();
    }
    return this.data.restaurantProfile;
  }

  public updateRestaurantProfile(updates: Partial<RestaurantProfileRecord>): RestaurantProfileRecord {
    if (!this.data.restaurantProfile) {
      this.data.restaurantProfile = this.getDefaultRestaurantProfile();
    }
    Object.assign(this.data.restaurantProfile, updates);
    this.persist();
    return this.data.restaurantProfile;
  }

  // Orders Management
  public createOrder(data: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    deliveryArea: string;
    items: { itemId: string; quantity: number }[];
    specialInstructions?: string;
    customerLatitude?: number;
    customerLongitude?: number;
  }): OrderRecord {
    const settings = this.data.deliverySettings;
    if (!settings.isRestaurantOpen) {
      throw new Error('Hotel Malabar is currently closed for new online orders.');
    }

    const area = this.data.deliveryAreas.find((a) => a.name === data.deliveryArea) || {
      id: 'default',
      name: data.deliveryArea,
      distanceKm: 2.0,
      isActive: true,
    };

    let foodTotal = 0;
    const orderItems: OrderItemRecord[] = [];
        }
    
    if (foodTotal < settings.minOrderAmount) {
      throw new Error(
        `Minimum food order is ₹${settings.minOrderAmount}. Current food total is ₹${foodTotal}.`
      );
    }

    const deliveryCharge = calculateDeliveryFee(area.distanceKm, settings);
    const grandTotal = foodTotal + deliveryCharge;

    const orderNumber = `#HM${this.data.nextOrderSequence++}`;
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    orderItems.forEach((item) => (item.orderId = orderId));

    const googleMapsUrl =
      typeof data.customerLatitude === 'number' && typeof data.customerLongitude === 'number'
        ? `https://www.google.com/maps?q=${data.customerLatitude},${data.customerLongitude}`
        : undefined;

    const newOrder: OrderRecord = {
      id: orderId,
      orderNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      deliveryAddress: data.deliveryAddress,
      deliveryArea: data.deliveryArea,
      deliveryDistanceKm: area.distanceKm,
      foodTotal,
      deliveryCharge,
      grandTotal,
      paymentMethod: 'Cash on Delivery',
      status: 'Order Placed',
      estimatedPrepTimeMinutes: settings.defaultPrepTimeMinutes,
      specialInstructions: data.specialInstructions,
      items: orderItems,
      customerLatitude: data.customerLatitude,
      customerLongitude: data.customerLongitude,
      googleMapsUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.orders.unshift(newOrder);

    // Increment profile total orders
    const profile = this.getCustomerProfile(data.customerId);
    if (profile) {
      profile.totalOrders = (profile.totalOrders || 0) + 1;
      profile.address = data.deliveryAddress;
      profile.deliveryArea = data.deliveryArea;
    }

    this.persist();
    return newOrder;
  }

  public getCustomerOrders(customerId: string): OrderRecord[] {
    return this.data.orders.filter((o) => o.customerId === customerId);
  }

  public getOrderById(orderId: string): OrderRecord | undefined {
    return this.data.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
  }

  public getAllOrders(): OrderRecord[] {
    return this.data.orders;
  }

  public updateOrderStatus(
    orderId: string,
    status: OrderRecord['status'],
    prepTimeMinutes?: number
  ): OrderRecord {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    order.status = status;
    order.updatedAt = new Date().toISOString();

    if (prepTimeMinutes !== undefined && prepTimeMinutes > 0) {
      order.estimatedPrepTimeMinutes = prepTimeMinutes;
    }
        }

    this.persist();
    return order;
  }

  // Delivery Settings & Areas
  public getDeliverySettings(): DeliverySettingsRecord {
    return this.data.deliverySettings;
  }

  public updateDeliverySettings(
    updates: Partial<DeliverySettingsRecord>
  ): DeliverySettingsRecord {
    Object.assign(this.data.deliverySettings, updates);
    this.persist();
    return this.data.deliverySettings;
  }

  public getDeliveryAreas(): DeliveryAreaRecord[] {
    return this.data.deliveryAreas;
  }

  public updateDeliveryAreas(
    areas: DeliveryAreaRecord[]
  ): DeliveryAreaRecord[] {
    this.data.deliveryAreas = areas;
    this.persist();
    return this.data.deliveryAreas;
  }

  public getAllCustomersWithOrders(): {
    user: Omit<UserRecord, 'passwordHash' | 'privacyPinHash'>;
    profile?: CustomerProfileRecord;
    ordersCount: number;
    lastOrderDate?: string;
    totalSpent: number;
  }[] {
    return this.data.users.map((user) => {
      const userOrders = this.data.orders.filter(
        (o) => o.customerId === user.id
      );
      const totalSpent = userOrders
        .filter((o) => o.status !== 'Order Rejected')
        .reduce((sum, o) => sum + o.grandTotal, 0);

      const profile = this.data.customerProfiles.find(
        (p) => p.userId === user.id
      );

      const safeUser = { ...user };
      delete (safeUser as any).passwordHash;
      delete (safeUser as any).privacyPinHash;

      return {
        user: safeUser,
        profile,
        ordersCount: userOrders.length,
        lastOrderDate: userOrders[0]?.createdAt,
        totalSpent,
                totalSpent,
      };
    });
  }

  // Admin Authentication
  public findAdminByPhone(phone: string): AdminUserRecord | undefined {
    const cleanPhone = phone.trim();
    return this.data.adminUsers.find(
      (a) =>
        a.phone === cleanPhone &&
        AUTHORIZED_ADMIN_PHONES.includes(a.phone as AuthorizedAdminPhone)
    );
  }

  public findAdminByUsername(username: string): AdminUserRecord | undefined {
    return this.data.adminUsers.find((a) => a.username === username);
  }

  public verifyAdminPassword(
    admin: AdminUserRecord,
    password: string
  ): boolean {
    return bcrypt.compareSync(password, admin.passwordHash);
  }

  public verifyAdminPin(admin: AdminUserRecord, pin: string): boolean {
    return bcrypt.compareSync(pin, admin.pinHash);
  }

  public updateAdminPassword(
    adminId: string,
    newPassword: string
  ): boolean {
    const admin = this.data.adminUsers.find((a) => a.id === adminId);
    if (!admin) return false;

    admin.passwordHash = bcrypt.hashSync(newPassword, 10);
    this.persist();
    return true;
  }

  public updateAdminPin(adminId: string, newPin: string): boolean {
    const admin = this.data.adminUsers.find((a) => a.id === adminId);
    if (!admin) return false;

    admin.pinHash = bcrypt.hashSync(newPin, 10);
    this.persist();
    return true;
  }
    return this.data.users.map((user) => {
      const userOrders = this.data.orders.filter((o) => o.customerId === user.id);
      const totalSpent = userOrders
        .filter((o) => o.status !== 'Order Rejected')
        .reduce((sum, o) => sum + o.grandTotal, 0);

      const profile = this.data.customerProfiles.find((p) => p.userId === user.id);

      const safeUser = { ...user };
      delete (safeUser as any).passwordHash;
      delete (safeUser as any).privacyPinHash;

      return {
        user: safeUser,
        profile,
        ordersCount: userOrders.length,
        lastOrderDate: userOrders[0]?.createdAt,
        totalSpent,
      };
    });
  }
}

export const db = new CentralDatabase();
