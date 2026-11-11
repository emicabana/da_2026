import useApi from './useApi';

export default function useProject() {
  const api = useApi();

  return {
    getPhotos: () => api.getJson('/photos'),
    getPublicAlbums: () => api.getJson('/albums/catalog'),
    getAlbums: () => api.getJson('/albums/mine'),
    getAlbumPhotos: (albumId) => api.getJson(`/albums/${encodeURIComponent(albumId)}/photos`),
    createAlbum: (formData) => api.postForm('/albums', formData),
    deleteAlbum: (albumId) => api.deleteJson(`/albums/${encodeURIComponent(albumId)}`),
    uploadPhoto: (formData) => api.postForm('/photos/upload', formData),
    updatePhoto: (photoId, updates) => api.patchJson(
      `/photos/${encodeURIComponent(photoId)}`,
      updates,
    ),
    updatePhotoWithImage: (photoId, formData) => api.patchForm(
      `/photos/${encodeURIComponent(photoId)}`,
      formData,
    ),
    deletePhoto: (photoId) => api.deleteJson(`/photos/${encodeURIComponent(photoId)}`),
    createOrder: (photoIds, couponCode) => api.postJson('/orders', {
      photos: photoIds,
      coupon_code: couponCode || undefined,
    }),
    getOrders: (role) => api.getJson(role === 'admin' ? '/orders' : '/orders/mine'),
    updateOrderStatus: (orderId, status) => api.patchJson(
      `/orders/${encodeURIComponent(orderId)}/status`,
      { status },
    ),
    getSales: () => api.getJson('/photographer/sales'),
    getCoupons: () => api.getJson('/photographer/coupons'),
    createCoupon: (coupon) => api.postJson('/photographer/coupons', coupon),
    updateCoupon: (couponId, updates) => api.patchJson(
      `/photographer/coupons/${encodeURIComponent(couponId)}`,
      updates,
    ),
    deleteCoupon: (couponId) => api.deleteJson(`/photographer/coupons/${encodeURIComponent(couponId)}`),
    getCollaborators: () => api.getJson('/photographer/collaborators'),
    getCollaborations: () => api.getJson('/photographer/collaborations'),
    createCollaborator: (collaborator) => api.postJson('/photographer/collaborators', collaborator),
    deleteCollaborator: (collaboratorId) => api.deleteJson(
      `/photographer/collaborators/${encodeURIComponent(collaboratorId)}`,
    ),
    respondToCollaboration: (collaborationId, response) => api.patchJson(
      `/photographer/collaborations/${encodeURIComponent(collaborationId)}/respond`,
      { response },
    ),
    leaveCollaboration: (collaborationId) => api.deleteJson(
      `/photographer/collaborations/${encodeURIComponent(collaborationId)}`,
    ),
    getStudio: () => api.getJson('/photographer/studio'),
    updateStudio: (studio) => api.patchJson('/photographer/studio', studio),
    updateAlbumOffers: (albumId, offers) => api.patchJson(
      `/albums/${encodeURIComponent(albumId)}/offers`,
      offers,
    ),
    createQuantityDiscount: (albumId, discount) => api.postJson(
      `/albums/${encodeURIComponent(albumId)}/quantity-discounts`,
      discount,
    ),
    updateQuantityDiscount: (albumId, discountId, updates) => api.patchJson(
      `/albums/${encodeURIComponent(albumId)}/quantity-discounts/${encodeURIComponent(discountId)}`,
      updates,
    ),
    deleteQuantityDiscount: (albumId, discountId) => api.deleteJson(
      `/albums/${encodeURIComponent(albumId)}/quantity-discounts/${encodeURIComponent(discountId)}`,
    ),
  };
}
