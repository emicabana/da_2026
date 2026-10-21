const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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

export function registerAccount(account) {
  return request('/register', {
    method: 'POST',
    body: JSON.stringify(account),
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

export function getMyProfile(token) {
  return request('/users/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function updateMyProfile(token, profile) {
  return request('/users/me', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profile),
  });
}

export function getPhotos() {
  return request('/photos');
}

export function getPublicAlbums() {
  return request('/albums/catalog');
}

export function getAlbums(token) {
  return request('/albums/mine', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getAlbumPhotos(token, albumId) {
  return request(`/albums/${encodeURIComponent(albumId)}/photos`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function createAlbum(token, album, cover) {
  const body = new FormData();
  Object.entries(album).forEach(([key, value]) => body.append(key, String(value)));
  body.append('cover', cover);
  return request('/albums', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });
}

export function deleteAlbum(token, albumId) {
  return request(`/albums/${encodeURIComponent(albumId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
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

export function uploadPhoto(token, photo, image) {
  const body = new FormData();
  body.append('title', photo.title);
  body.append('description', photo.description);
  body.append('price', String(photo.price));
  if (photo.album_id) body.append('album_id', photo.album_id);
  body.append('image', image);
  return request('/photos/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
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

export function updatePhotoWithImage(token, photoId, updates, image) {
  const body = new FormData();
  body.append('title', updates.title);
  body.append('description', updates.description);
  body.append('price', String(updates.price));
  if (updates.album_id) body.append('album_id', updates.album_id);
  body.append('image', image);
  return request(`/photos/${photoId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
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

export function createOrder(token, photoIds, couponCode = '') {
  return request('/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ photos: photoIds, coupon_code: couponCode || undefined }),
  });
}

function photographerRequest(token, endpoint, options = {}) {
  return request(`/photographer/${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

export function getPhotographerSales(token) {
  return photographerRequest(token, 'sales');
}

export function getPhotographerCoupons(token) {
  return photographerRequest(token, 'coupons');
}

export function createPhotographerCoupon(token, coupon) {
  return photographerRequest(token, 'coupons', { method: 'POST', body: JSON.stringify(coupon) });
}

export function updatePhotographerCoupon(token, couponId, updates) {
  return photographerRequest(token, `coupons/${encodeURIComponent(couponId)}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export function deletePhotographerCoupon(token, couponId) {
  return photographerRequest(token, `coupons/${encodeURIComponent(couponId)}`, { method: 'DELETE' });
}

export function getPhotographerCollaborators(token) {
  return photographerRequest(token, 'collaborators');
}

export function getPhotographerCollaborations(token) {
  return photographerRequest(token, 'collaborations');
}

export function addPhotographerCollaborator(token, collaborator) {
  return photographerRequest(token, 'collaborators', { method: 'POST', body: JSON.stringify(collaborator) });
}

export function deletePhotographerCollaborator(token, collaboratorId) {
  return photographerRequest(token, `collaborators/${encodeURIComponent(collaboratorId)}`, { method: 'DELETE' });
}

export function respondToPhotographerCollaboration(token, collaborationId, response) {
  return photographerRequest(token, `collaborations/${encodeURIComponent(collaborationId)}/respond`, {
    method: 'PATCH',
    body: JSON.stringify({ response }),
  });
}

export function leavePhotographerCollaboration(token, collaborationId) {
  return photographerRequest(token, `collaborations/${encodeURIComponent(collaborationId)}`, { method: 'DELETE' });
}

export function getStudioProfile(token) {
  return photographerRequest(token, 'studio');
}

export function updateStudioProfile(token, profile) {
  return photographerRequest(token, 'studio', { method: 'PATCH', body: JSON.stringify(profile) });
}

export function updateAlbumOffers(token, albumId, offers) {
  return request(`/albums/${encodeURIComponent(albumId)}/offers`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(offers),
  });
}

export function createQuantityDiscount(token, albumId, discount) {
  return request(`/albums/${encodeURIComponent(albumId)}/quantity-discounts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(discount),
  });
}

export function updateQuantityDiscount(token, albumId, discountId, updates) {
  return request(`/albums/${encodeURIComponent(albumId)}/quantity-discounts/${encodeURIComponent(discountId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(updates),
  });
}

export function deleteQuantityDiscount(token, albumId, discountId) {
  return request(`/albums/${encodeURIComponent(albumId)}/quantity-discounts/${encodeURIComponent(discountId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
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
