import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { RelationshipDims } from '../store/useTwinStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');

export const API = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let _token = '';

export function setToken(token: string) {
  _token = token;
  // احفظ في SecureStore كاحتياطي
  SecureStore.setItemAsync('mytwin_access_token', token).catch(() => {});
}

export function getToken() { return _token; }

async function resolveToken(): Promise<string> {
  // أولاً: الـ memory
  if (_token) return _token;

  // ثانياً: SecureStore مباشرة
  try {
    const direct = await SecureStore.getItemAsync('mytwin_access_token');
    if (direct) { _token = direct; return direct; }
  } catch {}

  // ثالثاً: Supabase session keys
  const supabaseKeys = [
    `sb-${(process.env.EXPO_PUBLIC_SUPABASE_URL || '').split('//')[1]?.split('.')[0]}-auth-token`,
    'supabase.auth.token',
  ];

  for (const key of supabaseKeys) {
    try {
      const raw = await SecureStore.getItemAsync(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const token =
        parsed?.access_token ||
        parsed?.currentSession?.access_token ||
        (Array.isArray(parsed) ? parsed[0]?.access_token : null);
      if (token) { _token = token; return token; }
    } catch {}
  }

  return '';
}

API.interceptors.request.use(async (config) => {
  const token = await resolveToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
    config.headers['auth'] = token;
  }
  return config;
});

API.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    return Promise.reject(error);
  }
);

export const askTwin = async (
  message: string,
  twinName: string,
  bond: number,
  dims: RelationshipDims,
  calm: boolean = false
) => {
  const { data } = await API.post('/api/chat', {
    message,
    twin_name: twinName,
    bond_level: bond,
    dims: {
      trust: dims.trust,
      affection: dims.affection,
      dependency: dims.dependency,
    },
    relationship_dims: {
      trust: dims.trust,
      affection: dims.affection,
      dependency: dims.dependency,
    },
  }, {
    headers: { 'X-Calm-Mode': String(calm) },
  });

  return {
    ...data,
    dims_update: {
      trust: data.dims?.trust ?? dims.trust,
      affection: data.dims?.affection ?? dims.affection,
      dependency: data.dims?.dependency ?? dims.dependency,
      empathy: dims.empathy,
      humor: dims.humor,
      support: dims.support,
    }
  };
};

export const startTrial = async (email: string, phone: string, deviceId: string) => {
  const { data } = await API.post('/api/trial/start', { email, phone, device_id: deviceId });
  return data;
};

export const transcribeAudio = async (): Promise<null> => null;

type MemoryPayload = {
  id?: string; user_id?: string; content: string;
  created_at?: string; importance_score?: number;
  memory_type?: string; emotion_tag?: string;
};

export const saveMemory = async (memory: MemoryPayload) =>
  API.post('/api/memory/save', memory);

export default API;
