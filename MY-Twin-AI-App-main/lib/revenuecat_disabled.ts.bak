import Purchases, { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';

export type { PurchasesPackage, CustomerInfo };

const RC_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';
const RC_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';

// لن يتم تفعيل RevenueCat الآن (لأننا نستخدم Google Play Billing مباشرة)
export const initRevenueCat = (userId: string) => {
  // تم تعطيل التهيئة مؤقتًا
  console.log('RevenueCat is disabled for Android. It will be enabled for iOS later.');
  return;
};
