const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.error || 'Something went wrong');
  return data;
}

export const api = {
  post:   (path, body, token) => request('POST',   path, body, token),
  get:    (path, token)       => request('GET',    path, null, token),
  patch:  (path, body, token) => request('PATCH',  path, body, token),
  delete: (path, token)       => request('DELETE', path, null, token),
};
