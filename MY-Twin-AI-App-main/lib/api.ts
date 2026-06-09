import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { RelationshipDims } from '../store/useTwinStore';
import { supabase } from './supabase';

// ── الثوابت ─────────────────────────────────────
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');

const APP_VERSION = Application.nativeApplicationVersion ?? '1.0.0';
const PLATFORM = Platform.OS;

// ── توليد Request ID ────────────────────────────
let requestCounter = 0;
function generateRequestId(): string {
  requestCounter++;
  return `${Date.now().toString(36)}-${requestCounter.toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
}

// ── إنشاء Axios Instance ────────────────────────
export const API = axios.create({
  baseURL: BASE_URL,
  timeout: 45000, // 45 ثانية كافية لنماذج الذكاء الاصطناعي
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── إدارة التوكن ────────────────────────────────
let _token = '';
export function setToken(token: string) {
  _token = token;
}
export function getToken() {
  return _token;
}

async function getFreshToken(): Promise<string> {
  if (_token && _token.length > 100) return _token;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token && session.access_token.length > 100) {
      _token = session.access_token;
      return _token;
    }
  } catch (e) {
    console.error('getSession error:', e);
  }
  return '';
}

// ── اعتراض الطلب: إضافة الهيدرات الضرورية ───────
API.interceptors.request.use(async (config) => {
  // منع الحلقة اللانهائية لإعادة المحاولة
  if (!config.headers['X-Request-ID']) {
    config.headers['X-Request-ID'] = generateRequestId();
  }
  
  // إرسال معلومات الجهاز
  config.headers['X-App-Version'] = APP_VERSION;
  config.headers['X-Platform'] = PLATFORM;

  const token = await getFreshToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ── اعتراض الاستجابة: تعامل مع 401 بشكل آمن ─────
// نستخدم متغيرًا مساعدًا على config نفسه لتجنب loop
interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

API.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    
    // معالجة الخطأ 401 مع منع التكرار
    if (error.response?.status === 401 && config && !config._retry) {
      config._retry = true;
      try {
        const {
          data: { session },
        } = await supabase.auth.refreshSession();
        if (session?.access_token) {
          _token = session.access_token;
          if (config.headers) {
            config.headers['Authorization'] = `Bearer ${_token}`;
          }
          return API(config);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
    }

    // يمكن إضافة Sentry هنا
    // if (Sentry) Sentry.captureException(error);

    console.error('❌ API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: config?.url,
      requestId: config?.headers?.['X-Request-ID'],
    });

    return Promise.reject(error);
  }
);

// ── إعادة المحاولة التلقائية لأخطاء الشبكة ──────
// تنفيذ بسيط بدون مكتبة خارجية (يمكن ترقية لـ axios-retry لاحقاً)
API.interceptors.response.use(
  undefined,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig & { _retryCount?: number };
    if (!config) return Promise.reject(error);

    // الأخطاء التي تستحق إعادة المحاولة
    const shouldRetry =
      !error.response || // Network error
      error.response.status >= 502; // 502, 503, 504

    if (shouldRetry) {
      config._retryCount = config._retryCount ?? 0;
      if (config._retryCount < 3) {
        config._retryCount++;
        // تأخير تصاعدي: 1s, 2s, 3s
        await new Promise((resolve) =>
          setTimeout(resolve, config._retryCount * 1000)
        );
        return API(config);
      }
    }

    return Promise.reject(error);
  }
);

// ── واجهة الطلب المخصصة للتطبيق ─────────────────
// أبعاد العلاقة الموسعة
export interface ExtendedRelationshipDims extends RelationshipDims {
  openness?: number;
  intimacy?: number;
  respect?: number;
  attachment?: number;
}

export const askTwin = async (
  message: string,
  twinName: string,
  bond: number,
  dims: ExtendedRelationshipDims,
  calm: boolean = false,
  lang: string = 'ar',
  image?: string
) => {
  // نرسل الأبعاد الكاملة كما هي في المتجر
  const payload: Record<string, any> = {
    message,
    twin_name: twinName,
    bond_level: bond,
    dims: {
      trust: dims.trust,
      affection: dims.affection,
      dependency: dims.dependency,
      empathy: dims.empathy,
      humor: dims.humor,
      support: dims.support,
      openness: dims.openness ?? 0,
      intimacy: dims.intimacy ?? 0,
      respect: dims.respect ?? 0,
      attachment: dims.attachment ?? 0,
    },
    relationship_dims: {
      trust: dims.trust,
      affection: dims.affection,
      dependency: dims.dependency,
      empathy: dims.empathy,
      humor: dims.humor,
      support: dims.support,
      openness: dims.openness ?? 0,
      intimacy: dims.intimacy ?? 0,
      respect: dims.respect ?? 0,
      attachment: dims.attachment ?? 0,
    },
    lang,
    image: image || undefined,
  };

  const { data } = await API.post('/api/chat', payload, {
    headers: {
      'X-Calm-Mode': String(calm),
    },
  });

  // نضمن أن dims_update لا تفقد أي بعد
  const updatedDims = {
    trust: data.dims?.trust ?? dims.trust,
    affection: data.dims?.affection ?? dims.affection,
    dependency: data.dims?.dependency ?? dims.dependency,
    empathy: data.dims?.empathy ?? dims.empathy,
    humor: data.dims?.humor ?? dims.humor,
    support: data.dims?.support ?? dims.support,
    openness: data.dims?.openness ?? dims.openness ?? 0,
    intimacy: data.dims?.intimacy ?? dims.intimacy ?? 0,
    respect: data.dims?.respect ?? dims.respect ?? 0,
    attachment: data.dims?.attachment ?? dims.attachment ?? 0,
  };

  return {
    ...data,
    dims_update: updatedDims,
  };
};

export const saveMemory = async (memory: object) =>
  API.post('/api/memory/save', memory);

export default API;
