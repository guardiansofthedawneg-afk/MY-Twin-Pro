import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';
import { RelationshipDims } from '../store/useTwinStore';
import { supabase } from './supabase';

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
  console.log('✅ Token saved, length:', token.length);
}
export function getToken() { return _token; }

async function getFreshToken(): Promise<string> {
  if (_token && _token.length > 100) {
    console.log('✅ Using memory token, length:', _token.length);
    return _token;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && session.access_token.length > 100) {
      _token = session.access_token;
      console.log('✅ Got Supabase token, length:', _token.length);
      return _token;
    }
  } catch (e) {
    console.error('getSession error:', e);
  }
  console.warn('❌ No valid token found');
  return '';
}

API.interceptors.request.use(async (config) => {
  const token = await getFreshToken();
  if (token) {
    const authValue = `Bearer ${token}`;
    config.headers['auth'] = authValue;
    config.headers['Authorization'] = authValue;
    console.log('📤 Sending auth header, total length:', authValue.length);
  }
  return config;
});

API.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    if (error.response?.status === 401) {
      try {
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session?.access_token) {
          _token = session.access_token;
          const config = error.config!;
          const authValue = `Bearer ${_token}`;
          config.headers['auth'] = authValue;
          config.headers['Authorization'] = authValue;
          return API(config);
        }
      } catch {}
    }
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

export const saveMemory = async (memory: object) =>
  API.post('/api/memory/save', memory);

export default API;
