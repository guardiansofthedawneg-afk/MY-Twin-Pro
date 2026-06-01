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
export function setToken(token: string) { _token = token; }
export function getToken() { return _token; }

// جلب التوكن من Supabase SecureStore
async function getStoredToken(): Promise<string> {
  if (_token) return _token;
  try {
    // Supabase v2 بيحفظ الـ session بهذا الـ key
    const keys = [
      'supabase.auth.token',
      `sb-${process.env.EXPO_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`,
    ];
    for (const key of keys) {
      const stored = await SecureStore.getItemAsync(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        const token = parsed?.access_token
          || parsed?.currentSession?.access_token
          || parsed?.[0]?.access_token
          || '';
        if (token) return token;
      }
    }
  } catch (e) {
    console.warn('Token fetch failed:', e);
  }
  return '';
}

API.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers['auth'] = token;
  return config;
});

API.interceptors.response.use(
  (response) => response,
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

export const saveMemory = async (memory: MemoryPayload) => API.post('/api/memory/save', memory);
export default API;
