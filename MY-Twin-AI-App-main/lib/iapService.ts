import { Platform } from 'react-native';
import {
  requestSubscription,
  getSubscriptions,
  finishTransaction,
  endConnection,
} from 'react-native-iap';
import type { Subscription, SubscriptionPurchase } from 'react-native-iap';

const productIds = ['plus_monthly', 'premium_monthly', 'pro_semiannual', 'yearly_annual'];

export const TIER_MAP: Record<string, string> = {
  plus_monthly: 'plus',
  premium_monthly: 'premium',
  pro_semiannual: 'pro',
  yearly_annual: 'yearly',
};

let connected = false;

export async function initIAP(): Promise<void> {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      await endConnection();
      connected = true;
    } catch (e) {
      console.log('IAP init error', e);
    }
  }
}

export async function getProducts(): Promise<Subscription[]> {
  if (!connected) await initIAP();
  try {
    const subscriptions = await getSubscriptions({ skus: productIds });
    return subscriptions;
  } catch (e) {
    console.log('getProducts error', e);
    return [];
  }
}

export async function purchaseSubscription(productId: string): Promise<boolean> {
  try {
    const result = await requestSubscription({ sku: productId });
    if (result) {
      const purchase: SubscriptionPurchase = Array.isArray(result) ? result[0] : result;
      if (purchase) {
        await finishTransaction({ purchase: purchase as any, isConsumable: false });
        return true;
      }
    }
    return false;
  } catch (e) {
    console.log('purchase error', e);
    return false;
  }
}

export async function restorePurchases(): Promise<Subscription[]> {
  try {
    const subscriptions = await getSubscriptions({ skus: productIds });
    return subscriptions;
  } catch (e) {
    console.log('restore error', e);
    return [];
  }
}

export function disconnectIAP(): void {
  try {
    endConnection();
    connected = false;
  } catch (e) {}
}
