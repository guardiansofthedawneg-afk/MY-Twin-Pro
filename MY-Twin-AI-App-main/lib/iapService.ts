import { Platform } from 'react-native';
import * as InAppPurchases from 'expo-in-app-purchases';

export const PRODUCT_SKUS = ['plus_monthly', 'premium_monthly', 'pro_semiannual', 'yearly_annual'];
export const TIER_MAP: Record<string, string> = {
  'plus_monthly': 'plus', 'premium_monthly': 'premium',
  'pro_semiannual': 'pro', 'yearly_annual': 'yearly'
};

export const initIAP = async (): Promise<void> => {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
  try { await InAppPurchases.connectAsync(); console.log('IAP Connected'); } 
  catch (e) { console.error('IAP Error:', e); }
};

export const getProducts = async () => {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return [];
  try {
    const { responseCode, results } = await InAppPurchases.getProductsAsync(PRODUCT_SKUS);
    if (responseCode === InAppPurchases.IAPResponseCode.OK) return results || [];
  } catch (e) { console.error('Get Products Error:', e); }
  return [];
};

export const purchaseSubscription = async (productId: string): Promise<boolean> => {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false;
  try {
    const result = await InAppPurchases.purchaseItemAsync(productId);
    return result.responseCode === InAppPurchases.IAPResponseCode.OK;
  } catch (error) { console.error('Purchase Failed:', error); return false; }
};

export const restorePurchases = async () => {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return [];
  try {    const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();
    if (responseCode === InAppPurchases.IAPResponseCode.OK) return results || [];
  } catch (e) { console.error('Restore Error:', e); }
  return [];
};

export const disconnectIAP = async (): Promise<void> => {
  try { await InAppPurchases.disconnectAsync(); } catch {}
};
