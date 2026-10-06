const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data?.error || 'Error de la API';
    throw new Error(message);
  }

  return data;
}

export function login({ user_name, password }) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ user_name, password }),
  });
}

export function getUsers(token) {
  return request('/users', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getPhotos() {
  return request('/photos');
}

export function createPhoto(token, photo) {
  return request('/photos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(photo),
  });
}

export function updatePhoto(token, photoId, updates) {
  return request(`/photos/${photoId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
}

export function deletePhoto(token, photoId) {
  return request(`/photos/${photoId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function createOrder(token, photoIds) {
  return request('/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ photos: photoIds }),
  });
}

export function getMyOrders(token) {
  return request('/orders/mine', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function createUser(token, user) {
  return request('/users', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(user),
  });
}

export function updateUser(token, username, updates) {
  return request(`/users/${encodeURIComponent(username)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
}

export function deleteUser(token, username) {
  return request(`/users/${encodeURIComponent(username)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function logout(token) {
  return request('/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
