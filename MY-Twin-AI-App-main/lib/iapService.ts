import { Platform } from 'react-native';
import * as InAppPurchases from 'expo-in-app-purchases';

export const PRODUCT_SKUS = [
  'plus_monthly',
  'premium_monthly',
  'pro_semiannual',
  'yearly_annual',
];

export const TIER_MAP: Record<string, string> = {
  'plus_monthly':    'plus',
  'premium_monthly': 'premium',
  'pro_semiannual':  'pro',
  'yearly_annual':   'yearly',
};

export const initIAP = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  try {
    await InAppPurchases.connectAsync();
  } catch (e) {
    console.error('IAP init error:', e);
  }
};

export const getProducts = async (): Promise<InAppPurchases.IAPItemDetails[]> => {
  if (Platform.OS !== 'android') return [];
  try {
    const { responseCode, results } = await InAppPurchases.getProductsAsync(PRODUCT_SKUS);
    if (responseCode === InAppPurchases.IAPResponseCode.OK) return results || [];
  } catch (e) {
    console.error('getProducts error:', e);
  }
  return [];
};

export const purchaseSubscription = async (productId: string): Promise<void> => {
  if (Platform.OS !== 'android') return;
  await InAppPurchases.purchaseItemAsync(productId);
};

export const restorePurchases = async (): Promise<InAppPurchases.InAppPurchase[]> => {
  if (Platform.OS !== 'android') return [];
  try {
    const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();
    if (responseCode === InAppPurchases.IAPResponseCode.OK) return results || [];
  } catch (e) {
    console.error('restore error:', e);
  }
  return [];
};

export const disconnectIAP = async (): Promise<void> => {
  try { await InAppPurchases.disconnectAsync(); } catch {}
};
