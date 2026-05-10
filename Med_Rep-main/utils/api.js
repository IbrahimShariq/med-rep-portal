import Constants from 'expo-constants';

const configuredBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  'http://192.168.100.47:8787';

export const API_BASE_URL = configuredBaseUrl.replace(/\/$/, '');

export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Portal API request failed');
  }

  return payload;
};
