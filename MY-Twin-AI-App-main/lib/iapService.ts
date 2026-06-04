/**
 * MyTwin - IAP Service
 * Google Play Billing via Expo modules
 */
import { Platform, Alert } from 'react-native';

export const TIER_MAP: Record<string, string> = {
  'plus_monthly':    'plus',
  'premium_monthly': 'premium',
  'pro_semiannual':  'pro',
  'yearly_annual':   'yearly',
};

export const PRODUCT_SKUS = Object.keys(TIER_MAP);

// Stub functions — يتم استبدالها بالمنطق الحقيقي لاحقاً
export const initIAP = async (): Promise<void> => {};

export const purchaseSubscription = async (productId: string): Promise<boolean> => {
  Alert.alert('قريباً', 'الاشتراكات ستكون متاحة قريباً على Google Play');
  return false;
};

export const restorePurchases = async (): Promise<string[]> => {
  return [];
};

export const disconnectIAP = async (): Promise<void> => {};
