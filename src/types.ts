export type PlatformType = 'amazon' | 'flipkart' | 'meesho' | 'blinkit' | 'instamart' | 'zepto';

export interface Product {
  id: string;
  title: string;
  platform: PlatformType;
  category: string;
  originalPrice: number;
  rewardAmount: number;
  imageUrl: string;
  videoUrl?: string;
  description: string;
  rating: number;
  totalReviews: number;
  inStock?: boolean;
  createdAt?: string;
}

export interface OfferBanner {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  imageUrl?: string;
  ctaText: string;
  targetAction?: 'open_plans' | 'open_tasks' | 'external';
  actionUrl?: string;
  active: boolean;
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  password?: string;
  displayName: string;
  photoURL?: string;
  role: 'user' | 'admin';
  status?: 'active' | 'inactive';
  walletBalance: number;
  totalEarned: number;
  completedTasksCount: number;
  demoTasksCompleted: number;
  activePlan: 'none' | '3_days' | '7_days' | '1_month' | '6_months' | '1_year';
  planExpiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewSubmission {
  id: string;
  userId: string;
  userEmail: string;
  productId: string;
  productTitle: string;
  platform: PlatformType;
  rating: number;
  reviewText: string;
  qualityRating: number;
  deliveryRating: number;
  rewardEarned: number;
  status: 'approved' | 'pending';
  createdAt: string;
}

export interface SubscriptionPlan {
  id: '3_days' | '7_days' | '1_month' | '6_months' | '1_year';
  name: string;
  durationLabel: string;
  durationDays: number;
  price: number;
  dailyTaskLimit: number;
  dailyEarningPotential: number;
  popular?: boolean;
  badge?: string;
  features: string[];
}

export interface SubscriptionPayment {
  id: string;
  userId: string;
  userEmail: string;
  planId: string;
  planName: string;
  planDurationDays: number;
  amount: number;
  paymentMethod: 'upi' | 'gpay' | 'phonepe' | 'paytm' | 'bank_transfer' | 'qr_scanner';
  transactionId: string;
  senderAccountOrPhone: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  method: 'upi' | 'phonepe' | 'gpay' | 'paytm' | 'bank_transfer' | 'imps';
  accountDetails: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
}

export interface AdminSettings {
  qrCodeUrl: string;
  upiId: string;
  phonePeNumber: string;
  gPayNumber: string;
  paytmNumber: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  accountHolderName: string;
  instructions: string;
  updatedAt?: string;
}
