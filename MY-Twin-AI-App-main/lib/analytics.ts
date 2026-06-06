import PostHog from 'posthog-react-native';

let posthog: PostHog | null = null;

export async function initAnalytics() {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!apiKey) {
    console.log('PostHog key not set, analytics disabled');
    return;
  }
  try {
    posthog = new PostHog(apiKey, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    });
    console.log('✅ PostHog initialized');
  } catch (e) {
    console.error('PostHog init failed:', e);
  }
}

export function track(event: string, properties?: Record<string, any>) {
  if (!posthog) return;
  posthog.capture(event, properties);
}

export function identify(userId: string, traits?: Record<string, any>) {
  if (!posthog) return;
  posthog.identify(userId, traits);
}
