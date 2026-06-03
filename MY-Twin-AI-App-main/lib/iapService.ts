import { Platform } from 'react-native';
import { initConnection, getProducts, requestPurchase, getAvailablePurchases, finishTransaction, purchaseUpdatedListener, purchaseErrorListener } from 'react-native-iap';

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
    console.log('✅ IAP Connected');
  } catch (error) {
    console.error('❌ IAP Connection Error:', error);
  }
};

export const getProducts = async (): Promise<InAppPurchases.IAPItemDetails[]> => {
  if (Platform.OS !== 'android') return [];
  try {
    const { responseCode, results } = await InAppPurchases.getProductsAsync(PRODUCT_SKUS);
    if (responseCode === InAppPurchases.IAPResponseCode.OK) {
      return results || [];
    }
    return [];
  } catch (error) {
    console.error('❌ Get Products Error:', error);
    return [];
  }
};

export const purchaseSubscription = async (productId: string): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  try {
    await InAppPurchases.purchaseItemAsync(productId);
    return true;
  } catch (error) {
    console.error('❌ Purchase Error:', error);
    return false;
  }
};

export const restorePurchases = async (): Promise<InAppPurchases.InAppPurchase[]> => {
  if (Platform.OS !== 'android') return [];
  try {
    const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();
    if (responseCode === InAppPurchases.IAPResponseCode.OK) {
      return results || [];
    }
    return [];
  } catch (error) {
    console.error('❌ Restore Error:', error);
    return [];
  }
};

export const disconnectIAP = async (): Promise<void> => {
  try {
    await InAppPurchases.disconnectAsync();
  } catch {}
};
