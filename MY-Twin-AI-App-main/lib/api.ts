import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { RelationshipDims } from '../store/useTwinStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
  (Platform.OS === 'android' 
    ? 'http://10.0.2.2:8000' 
    : 'http://localhost:8000');

export const API = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let _token = '';
export function setToken(token: string) { _token = token; }

API.interceptors.request.use(async (config) => {
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`;
  } else {
    try {
      const token = await SecureStore.getItemAsync('supabase.auth.token');
      if (token) {
        const parsed = JSON.parse(token);
        const accessToken = parsed?.access_token || parsed?.currentSession?.access_token;
        if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch (e) {
      console.warn('Failed to get token from SecureStore');
    }
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('API Error:', { status: error.response?.status, url: error.config?.url });
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
  try {
    const { data } = await API.post('/api/chat', {
      message,
      twin_name: twinName,
      bond_level: bond,
      relationship_dims: {
        trust: dims.trust,
        affection: dims.affection,
        dependency: dims.dependency,
      },
    }, {
      headers: { 'X-Calm-Mode': String(calm) },
    });

    // مزامنة dims الراجعة من backend مع store
    return {
      ...data,
      dims_update: {
        trust: data.relationship_dims?.trust ?? dims.trust,
        affection: data.relationship_dims?.affection ?? dims.affection,
        dependency: data.relationship_dims?.dependency ?? dims.dependency,
        empathy: dims.empathy,
        humor: dims.humor,
        support: dims.support,
      }
    };
  } catch (error) {
    const err = error as AxiosError;
    if (err.response?.status === 429) throw new Error("المحادثات كتير دلوقتي، استنى شوية ونكمل 🥺");
    if (err.response?.status === 401) throw new Error("انتهت صلاحية الجلسة، سجل دخول تاني");
    throw new Error("حصل خطأ في الاتصال... جرب تاني");
  }
};

export const startTrial = async (email: string, phone: string, deviceId: string) => {
  const { data } = await API.post('/api/trial/start', { email, phone, device_id: deviceId });
  return data;
};

export const transcribeAudio = async (): Promise<null> => null;

type MemoryPayload = {
  id?: string;
  user_id?: string;
  content: string;
  created_at?: string;
  importance_score?: number;
  memory_type?: string;
  emotion_tag?: string;
};

export const saveMemory = async (memory: MemoryPayload) => API.post('/api/memory/save', memory);

export default API;
