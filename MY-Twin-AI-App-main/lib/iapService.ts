import {
  initConnection,
  getProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  Product,
  Purchase
} from 'react-native-iap';

const PRODUCT_SKUS = ['mytwin_plus', 'mytwin_premium', 'mytwin_pro'];

let purchaseUpdateSubscription: any;
let purchaseErrorSubscription: any;

export const connectIAP = async (): Promise<boolean> => {
  try {
    const connected = await initConnection();
    console.log('IAP Connected:', connected);
    return true;
  } catch (err) {
    console.warn('IAP Connection error:', err);
    return false;
  }
};

export const getIAPProducts = async (): Promise<Product[]> => {
  try {
    const products = await getProducts({skus: PRODUCT_SKUS});
    console.log('IAP Products:', products);
    return products;
  } catch (err) {
    console.warn('IAP Products error:', err);
    return [];
  }
};

export const purchaseProduct = async (sku: string): Promise<Purchase | null> => {
  try {
    const purchase = await requestPurchase({sku});
    console.log('IAP Purchase:', purchase);
    return purchase;
  } catch (err: any) {
    if (err.code === 'E_USER_CANCELLED') {
      console.log('User cancelled purchase');
    } else {
      console.warn('IAP Purchase error:', err);
    }
    return null;
  }
};

export const restorePurchases = async (): Promise<Purchase[]> => {
  try {
    const purchases = await getAvailablePurchases();
    console.log('IAP Restored:', purchases);
    return purchases;
  } catch (err) {
    console.warn('IAP Restore error:', err);
    return [];
  }
};

export const setupPurchaseListeners = (
  onSuccess: (purchase: Purchase) => void,
  onError: (error: any) => void
) => {
  purchaseUpdateSubscription = purchaseUpdatedListener((purchase: Purchase) => {
    console.log('Purchase updated:', purchase);
    finishTransaction({purchase, isConsumable: false});
    onSuccess(purchase);
  });

  purchaseErrorSubscription = purchaseErrorListener((error: any) => {
    console.warn('Purchase error:', error);
    onError(error);
  });
};

export const disconnectIAP = () => {
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
    purchaseUpdateSubscription = null;
  }
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
    purchaseErrorSubscription = null;
  }
};
