import { useEffect, useRef, useState } from 'react';
import {
  createAlbum,
  deleteAlbum,
  deletePhoto,
  getAlbumPhotos,
  getAlbums,
  getMyProfile,
  getPhotos,
  updatePhoto,
  updateMyProfile,
  updatePhotoWithImage,
  uploadPhoto,
} from '../services/api';

const emptyPhoto = { title: '', description: '', price: '' };
const createEmptyAlbum = () => {
  const today = new Date();
  const date = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  return {
    name: '',
    date,
    description: '',
    photo_price: '',
    video_price: '',
    category: 'Running',
  };
};
const albumCategories = ['Running', 'Surf', 'Fútbol', 'Carreras', 'Otros'];
const formatPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const maxImageSize = 10 * 1024 * 1024;
const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function displayName(username) {
  return username
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function PhotographerDashboard({ token, username }) {
  const [albums, setAlbums] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [profile, setProfile] = useState({ display_name: username, email: '' });
  const [profileDraft, setProfileDraft] = useState({ display_name: '', email: '' });
  const [albumPhotos, setAlbumPhotos] = useState([]);
  const [draft, setDraft] = useState(emptyPhoto);
  const [albumDraft, setAlbumDraft] = useState(createEmptyAlbum);
  const [image, setImage] = useState(null);
  const [cover, setCover] = useState(null);
  const [editingId, setEditingId] = useState('');
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [view, setView] = useState('profile');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [deletingAlbum, setDeletingAlbum] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
  const previewUrlRef = useRef('');
  const coverPreviewUrlRef = useRef('');

  useEffect(() => {
    let active = true;
    Promise.all([getPhotos(), getAlbums(token), getMyProfile(token)])
      .then(([allPhotos, userAlbums, userProfile]) => {
        if (active) {
          const accessibleAlbumIds = new Set(userAlbums.map((album) => String(album._id || album.id)));
          setPhotos(allPhotos.filter((photo) =>
            photo.owner_username === username || accessibleAlbumIds.has(String(photo.album_id || ''))
          ));
          setAlbums(userAlbums);
          setProfile(userProfile);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [token, username, refreshKey]);

  useEffect(() => {
    function closeSettingsOnEscape(event) {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
        setSettingsDialog('');
      }
    }
    window.addEventListener('keydown', closeSettingsOnEscape);
    return () => window.removeEventListener('keydown', closeSettingsOnEscape);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (coverPreviewUrlRef.current) URL.revokeObjectURL(coverPreviewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedAlbumId || view !== 'album') return undefined;
    let active = true;
    getAlbumPhotos(token, selectedAlbumId)
      .then((items) => {
        if (active) setAlbumPhotos(items);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => { active = false; };
  }, [token, selectedAlbumId, view, refreshKey]);

  function clearImagePreview() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    setPreviewUrl('');
    setImage(null);
  }

  function clearCoverPreview() {
    if (coverPreviewUrlRef.current) URL.revokeObjectURL(coverPreviewUrlRef.current);
    coverPreviewUrlRef.current = '';
    setCoverPreviewUrl('');
    setCover(null);
  }

  function handleImageChange(event) {
    const selectedImage = event.target.files?.[0] || null;
    event.target.value = '';
    setError('');
    if (!selectedImage) return;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    setPreviewUrl('');
    setImage(null);
    if (!imageTypes.includes(selectedImage.type)) {
      setError('Elegí una imagen JPG, PNG, WEBP o GIF.');
      return;
    }
    if (selectedImage.size > maxImageSize) {
      setError('La imagen no puede superar los 10 MB.');
      return;
    }
    previewUrlRef.current = URL.createObjectURL(selectedImage);
    setPreviewUrl(previewUrlRef.current);
    setImage(selectedImage);
  }

  function handleCoverChange(event) {
    const selectedCover = event.target.files?.[0] || null;
    event.target.value = '';
    setError('');
    if (!selectedCover) return;
    clearCoverPreview();
    if (!imageTypes.includes(selectedCover.type)) {
      setError('Elegí una portada JPG, PNG, WEBP o GIF.');
      return;
    }
    if (selectedCover.size > maxImageSize) {
      setError('La portada no puede superar los 10 MB.');
      return;
    }
    const objectUrl = URL.createObjectURL(selectedCover);
    coverPreviewUrlRef.current = objectUrl;
    setCoverPreviewUrl(objectUrl);
    setCover(selectedCover);
  }

  async function handleCreateAlbum(event) {
    event.preventDefault();
    if (!cover) {
      setError('Seleccioná una portada para el álbum.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const album = await createAlbum(token, {
        ...albumDraft,
        photo_price: Number(albumDraft.photo_price),
        video_price: Number(albumDraft.video_price),
      }, cover);
      setAlbums((current) => [album, ...current]);
      setAlbumDraft(createEmptyAlbum());
      clearCoverPreview();
      setSelectedAlbumId(String(album._id || album.id));
      setAlbumPhotos([]);
      setView('album');
      setMessage('Álbum creado. Ya podés agregarle fotos.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function openProfileEditor() {
    setProfileDraft({
      display_name: profile.display_name || '',
      email: profile.email || '',
    });
    setError('');
    setMessage('');
    setSettingsOpen(false);
    setSettingsDialog('profile');
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updatedProfile = await updateMyProfile(token, profileDraft);
      setProfile(updatedProfile);
      setSettingsDialog('');
      setMessage('Perfil actualizado correctamente.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const photoData = { ...draft, price: Number(draft.price) };
      if (!editingId && !selectedAlbumId) {
        setError('Primero seleccioná o creá un álbum.');
        setSaving(false);
        return;
      }
      if (selectedAlbumId) photoData.album_id = selectedAlbumId;
      if (editingId) {
        if (image) {
          await updatePhotoWithImage(token, editingId, photoData, image);
        } else {
          await updatePhoto(token, editingId, photoData);
        }
      } else {
        if (!image) {
          setError('Seleccioná una imagen antes de publicarla.');
          setSaving(false);
          return;
        }
        await uploadPhoto(token, photoData, image);
      }
      setMessage(editingId ? 'Foto actualizada.' : 'Foto publicada.');
      setDraft(emptyPhoto);
      clearImagePreview();
      setEditingId('');
      setView(selectedAlbumId ? 'album' : 'profile');
      setLoading(true);
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function startEditing(photo) {
    setEditingId(photo._id || photo.id);
    setDraft({
      title: photo.title || '',
      description: photo.description || '',
      price: String(photo.price ?? ''),
    });
    clearImagePreview();
    setSelectedAlbumId(String(photo.album_id || selectedAlbumId || ''));
    setError('');
    setMessage('');
    setView('upload');
  }

  function startUploading() {
    setEditingId('');
    setDraft({
      ...emptyPhoto,
      price: selectedAlbum ? String(selectedAlbum.photo_price) : '',
    });
    clearImagePreview();
    setError('');
    setMessage('');
    setView('upload');
  }

  function cancelEditing() {
    setEditingId('');
    setDraft(emptyPhoto);
    clearImagePreview();
    setError('');
    setView(selectedAlbumId ? 'album' : 'profile');
  }

  async function handleDelete(photo) {
    const id = photo._id || photo.id;
    if (!window.confirm(`¿Eliminar “${photo.title}”?`)) return;

    setDeletingId(id);
    setError('');
    setMessage('');
    try {
      await deletePhoto(token, id);
      setPhotos((current) => current.filter((item) => (item._id || item.id) !== id));
      setAlbumPhotos((current) => current.filter((item) => (item._id || item.id) !== id));
      if (editingId === id) cancelEditing();
      setMessage('Foto eliminada.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId('');
    }
  }

  async function handleDeleteAlbum() {
    if (!selectedAlbum || selectedAlbum.owner_username !== username) return;
    const photoCount = albumPhotos.length;
    const photoLabel = photoCount === 1 ? '1 foto' : `${photoCount} fotos`;
    if (!window.confirm(`¿Eliminar el álbum “${selectedAlbum.name}” y sus ${photoLabel}? Esta acción no se puede deshacer.`)) return;

    setDeletingAlbum(true);
    setError('');
    setMessage('');
    try {
      await deleteAlbum(token, selectedAlbumId);
      setAlbums((current) => current.filter((album) => String(album._id || album.id) !== selectedAlbumId));
      setPhotos((current) => current.filter((photo) => String(photo.album_id || '') !== selectedAlbumId));
      setSelectedAlbumId('');
      setAlbumPhotos([]);
      setView('profile');
      setMessage('Álbum y fotos eliminados.');
      setLoading(true);
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingAlbum(false);
    }
  }

  const name = profile.display_name?.trim() || displayName(username);
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const selectedAlbum = albums.find((album) => String(album._id || album.id) === selectedAlbumId);

  if (view === 'create-album') {
    return (
      <section className="photographer-dashboard photographer-upload" aria-labelledby="album-form-title">
        <button className="button button-quiet photographer-back" type="button" onClick={() => { setView('profile'); setError(''); }}>
          <span aria-hidden="true">←</span> Volver al perfil
        </button>
        <div className="photographer-upload-heading">
          <p className="eyebrow">PERFIL / @{username}</p>
          <h1 id="album-form-title">Crear nuevo álbum</h1>
          <p className="heading-copy">Organizá tus fotografías en una nueva colección.</p>
        </div>
        <form className="surface photographer-upload-card photo-form" onSubmit={handleCreateAlbum}>
          <section className="album-form-section">
            <h2>Información básica</h2>
            <label className="photographer-image-picker">
              {coverPreviewUrl ? (
                <img className="photographer-image-preview" src={coverPreviewUrl} alt="Portada seleccionada" />
              ) : (
                <span className="photographer-image-placeholder" aria-hidden="true">▧</span>
              )}
              <span className="photographer-image-copy">
                <strong>{cover ? cover.name : 'Elegir portada del álbum'}</strong>
                <span>JPG, PNG, WEBP o GIF · Máximo 10 MB</span>
              </span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleCoverChange} />
            </label>
            <div className="album-basic-fields">
              <label>
                Nombre
                <input required maxLength={100} value={albumDraft.name} onChange={(event) => setAlbumDraft({ ...albumDraft, name: event.target.value })} placeholder="Nombre del álbum" />
              </label>
              <label>
                Fecha
                <input required type="date" value={albumDraft.date} onChange={(event) => setAlbumDraft({ ...albumDraft, date: event.target.value })} />
              </label>
            </div>
            <label>
              Descripción <span className="optional-label">Opcional</span>
              <textarea rows="4" maxLength={1000} value={albumDraft.description} onChange={(event) => setAlbumDraft({ ...albumDraft, description: event.target.value })} placeholder="Contá de qué se trata este álbum" />
            </label>
          </section>
          <section className="album-form-section">
            <h2>Precios (ARS)</h2>
            <div className="album-price-fields">
              <label>
                Precio por foto
                <input required type="number" min="0" step="0.01" value={albumDraft.photo_price} onChange={(event) => setAlbumDraft({ ...albumDraft, photo_price: event.target.value })} placeholder="Precio por foto" />
              </label>
              <label>
                Precio por video
                <input required type="number" min="0" step="0.01" value={albumDraft.video_price} onChange={(event) => setAlbumDraft({ ...albumDraft, video_price: event.target.value })} placeholder="Precio por video" />
              </label>
            </div>
          </section>
          <section className="album-form-section">
            <h2>Categoría</h2>
            <div className="album-category-options">
              {albumCategories.map((category) => (
                <button
                  className={`album-category-option${albumDraft.category === category ? ' is-selected' : ''}`}
                  type="button"
                  key={category}
                  aria-pressed={albumDraft.category === category}
                  onClick={() => setAlbumDraft({ ...albumDraft, category })}
                >
                  <span aria-hidden="true">{category === 'Running' ? '🏃' : category === 'Surf' ? '🏄' : category === 'Fútbol' ? '⚽' : category === 'Carreras' ? '🏎️' : '▦'}</span>
                  {category}
                </button>
              ))}
            </div>
          </section>
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Creando…' : 'Crear álbum'}</button>
          </div>
        </form>
      </section>
    );
  }

  if (view === 'upload') {
    return (
      <section className="photographer-dashboard photographer-upload" aria-labelledby="photo-form-title">
        <button
          className="button button-quiet photographer-back"
          type="button"
          onClick={() => {
            setView('profile');
            setError('');
          }}
        >
          <span aria-hidden="true">←</span> Volver al perfil
        </button>
        <div className="photographer-upload-heading">
          <p className="eyebrow">ÁLBUM / {selectedAlbum?.name || 'Fotos anteriores'}</p>
          <h1 id="photo-form-title">{editingId ? 'Editar foto' : 'Publicar fotografía'}</h1>
          <p className="heading-copy">Completá los detalles para agregarla a este álbum.</p>
        </div>
        <form className="surface photographer-upload-card photo-form" onSubmit={handleSubmit}>
          <label className="photographer-image-picker">
            {previewUrl ? (
              <img className="photographer-image-preview" src={previewUrl} alt="Vista previa de la fotografía seleccionada" />
            ) : (
              <span className="photographer-image-placeholder" aria-hidden="true">＋</span>
            )}
            <span className="photographer-image-copy">
              <strong>{image ? image.name : editingId ? 'Elegir otra fotografía' : 'Elegir fotografía'}</strong>
              <span>JPG, PNG, WEBP o GIF · Máximo 10 MB</span>
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageChange}
            />
          </label>
          {editingId && !image && <p className="photographer-current-image">La publicación conservará su imagen actual.</p>}
          <div className="photo-form">
            <label>
              Título
              <input required maxLength={100} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ej. Atardecer en la costa" />
            </label>
            <label>
              Descripción <span className="optional-label">Opcional</span>
              <textarea rows="4" maxLength={500} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Contá brevemente sobre esta foto" />
            </label>
            <label>
              Precio (ARS) · definido por el álbum
              <input required type="number" min="0" step="0.01" value={draft.price} readOnly placeholder="0" />
            </label>
          </div>
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Publicar foto'}
            </button>
            {editingId && <button className="button button-quiet" type="button" onClick={cancelEditing}>Cancelar edición</button>}
          </div>
        </form>
      </section>
    );
  }

  if (view === 'album' && selectedAlbum) {
    return (
      <section className="photographer-dashboard photographer-profile" aria-labelledby="album-title">
        <button className="button button-quiet photographer-back" type="button" onClick={() => { setView('profile'); setError(''); }}>
          <span aria-hidden="true">←</span> Volver a mis álbumes
        </button>
        <div className="photographer-album-header">
          <img src={selectedAlbum.cover_url} alt="" />
          <div>
            <p className="eyebrow">{selectedAlbum.category} · {new Date(selectedAlbum.date).toLocaleDateString('es-AR')}</p>
            <h1 id="album-title">{selectedAlbum.name}</h1>
            {selectedAlbum.description && <p className="heading-copy">{selectedAlbum.description}</p>}
            <p className="photographer-album-price">Fotos {formatPrice.format(selectedAlbum.photo_price)} · Videos {formatPrice.format(selectedAlbum.video_price)}</p>
          </div>
          <div className="photographer-album-actions">
            <button className="button button-primary photographer-upload-button" type="button" onClick={startUploading}>
              <span aria-hidden="true">＋</span> Agregar fotos
            </button>
            {selectedAlbum.owner_username === username && (
              <button className="button button-danger" type="button" onClick={handleDeleteAlbum} disabled={deletingAlbum}>
                {deletingAlbum ? 'Eliminando…' : 'Eliminar álbum'}
              </button>
            )}
          </div>
        </div>
        {error && <p className="notice notice-error photographer-feedback" role="alert">{error}</p>}
        {message && <p className="notice notice-success photographer-feedback" role="status">{message}</p>}
        <div className="photographer-gallery-heading">
          <span aria-hidden="true">▦</span>
          <h2>Fotos del álbum</h2>
          <span>{albumPhotos.length} {albumPhotos.length === 1 ? 'foto' : 'fotos'}</span>
        </div>
        {albumPhotos.length === 0 ? (
          <div className="photographer-empty-state">
            <span className="photographer-empty-icon" aria-hidden="true">▱</span>
            <h2>Este álbum todavía no tiene fotos</h2>
            <p>Agregá la primera fotografía para empezar a completar esta colección.</p>
            <button className="button button-primary" type="button" onClick={startUploading}>Agregar primera foto</button>
          </div>
        ) : (
          <div className="photographer-gallery">
            {albumPhotos.map((photo) => {
              const id = photo._id || photo.id;
              return (
                <article className="photographer-gallery-item" key={id}>
                  <img src={photo.url} alt={photo.title} loading="lazy" />
                  <div className="photographer-photo-overlay">
                    <strong>{photo.title}</strong>
                    <span>{formatPrice.format(photo.price)}</span>
                    {photo.description && <p>{photo.description}</p>}
                    {(photo.owner_username === username || album.owner_username === username || album.shared_permission === 'full') && <div className="photo-card-actions">
                      <button className="button button-quiet button-small" type="button" onClick={() => startEditing(photo)}>Editar</button>
                      <button className="button button-danger button-small" type="button" onClick={() => handleDelete(photo)} disabled={deletingId === id}>{deletingId === id ? 'Eliminando…' : 'Eliminar'}</button>
                    </div>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="photographer-dashboard photographer-profile" aria-labelledby="photographer-title">
      <div className="photographer-profile-header">
        <div className="photographer-avatar" aria-hidden="true">{initials}</div>
        <div className="photographer-profile-info">
          <div className="photographer-name-row">
            <div>
              <h1 id="photographer-title">{name}</h1>
              <p className="photographer-handle">@{username}</p>
            </div>
            <div className="photographer-settings-wrap">
              <button
                className="button button-quiet photographer-settings"
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                aria-label="Configuración del perfil"
                aria-expanded={settingsOpen}
                aria-haspopup="menu"
                title="Configuración del perfil"
              >
                ⚙
              </button>
              {settingsOpen && (
                <div className="photographer-settings-menu" role="menu">
                  <button type="button" role="menuitem" onClick={openProfileEditor}>
                    <span aria-hidden="true">✎</span> Editar perfil
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSettingsOpen(false);
                      setSettingsDialog('limits');
                    }}
                  >
                    <span aria-hidden="true">ⓘ</span> Límites de cuenta
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="photographer-profile-stats">
            <span><strong>{albums.length}</strong> {albums.length === 1 ? 'álbum' : 'álbumes'}</span>
            <span><strong>{photos.length}</strong> {photos.length === 1 ? 'foto' : 'fotos'}</span>
            <span><strong>Fotógrafo</strong></span>
          </div>
          <button className="button button-primary photographer-upload-button" type="button" onClick={() => { setMessage(''); setError(''); setView('create-album'); }}>
            <span aria-hidden="true">＋</span> Crear álbum
          </button>
        </div>
      </div>

      {error && (
        <div className="photographer-feedback">
          <p className="notice notice-error" role="alert">{error}</p>
          <button className="button button-quiet button-small" type="button" onClick={() => { setLoading(true); setError(''); setRefreshKey((key) => key + 1); }}>Intentar de nuevo</button>
        </div>
      )}
      {message && <p className="notice notice-success photographer-feedback" role="status">{message}</p>}

      <div className="photographer-gallery-heading">
        <span aria-hidden="true">▦</span>
        <h2>Mis álbumes</h2>
        <button className="button button-quiet button-small" type="button" onClick={() => { setLoading(true); setError(''); setRefreshKey((key) => key + 1); }} disabled={loading}>Actualizar</button>
      </div>

      {loading ? (
        <div className="photographer-empty-state"><p>Cargando tu perfil…</p></div>
      ) : error ? (
        <div className="photographer-empty-state">
          <h2>No pudimos mostrar tus álbumes</h2>
          <p>Revisá tu conexión e intentá actualizar el perfil.</p>
          <button className="button button-quiet" type="button" onClick={() => { setLoading(true); setError(''); setRefreshKey((key) => key + 1); }}>Intentar de nuevo</button>
        </div>
      ) : albums.length === 0 ? (
        <div className="photographer-empty-state">
          <span className="photographer-empty-icon" aria-hidden="true">▱</span>
          <h2>Sin álbumes</h2>
          <p>Aún no has creado ningún álbum. ¡Comenzá creando tu primera colección!</p>
          <button className="button button-primary" type="button" onClick={() => setView('create-album')}>Crear álbum</button>
        </div>
      ) : (
        <>
          <div className="photographer-album-grid">
            {albums.map((album) => {
              const id = String(album._id || album.id);
              const photoCount = photos.filter((photo) => String(photo.album_id || '') === id).length;
              return (
                <button
                  className="photographer-album-card"
                  key={id}
                  type="button"
                  onClick={() => {
                    setSelectedAlbumId(id);
                    setAlbumPhotos([]);
                    setError('');
                    setMessage('');
                    setView('album');
                  }}
                >
                  <span className="photographer-album-cover">
                    <img src={album.cover_url} alt="" loading="lazy" />
                    <span>{photoCount} {photoCount === 1 ? 'foto' : 'fotos'}</span>
                  </span>
                  <strong>{album.name}</strong>
                  <span>{new Date(album.date).toLocaleDateString('es-AR')} · {album.category}</span>
                </button>
              );
            })}
          </div>
          {photos.some((photo) => !photo.album_id) && (
            <>
              <div className="photographer-gallery-heading photographer-legacy-heading">
                <h2>Fotos sin álbum</h2>
              </div>
              <div className="photographer-gallery">
                {photos.filter((photo) => !photo.album_id).map((photo) => {
                  const id = photo._id || photo.id;
                  return (
                    <article className="photographer-gallery-item" key={id}>
                      <img src={photo.url} alt={photo.title} loading="lazy" />
                      <div className="photographer-photo-overlay">
                        <strong>{photo.title}</strong>
                        <span>{formatPrice.format(photo.price)}</span>
                        {photo.description && <p>{photo.description}</p>}
                        <div className="photo-card-actions">
                          <button className="button button-quiet button-small" type="button" onClick={() => startEditing(photo)}>Editar</button>
                          <button className="button button-danger button-small" type="button" onClick={() => handleDelete(photo)} disabled={deletingId === id}>{deletingId === id ? 'Eliminando…' : 'Eliminar'}</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {settingsDialog && (
        <div
          className="photographer-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSettingsDialog('');
              setError('');
            }
          }}
        >
          <section
            className="photographer-settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="photographer-settings-title"
          >
            <div className="photographer-settings-dialog-heading">
              <div>
                <p className="eyebrow">CONFIGURACIÓN DE CUENTA</p>
                <h2 id="photographer-settings-title">
                  {settingsDialog === 'profile' ? 'Editar perfil' : 'Límites de cuenta'}
                </h2>
              </div>
              <button
                className="button button-quiet photographer-settings-close"
                type="button"
                onClick={() => { setSettingsDialog(''); setError(''); }}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            {settingsDialog === 'profile' ? (
              <form className="photographer-settings-form" onSubmit={handleProfileSave}>
                <label>
                  Nombre visible
                  <input
                    required
                    maxLength={80}
                    value={profileDraft.display_name}
                    onChange={(event) => setProfileDraft({ ...profileDraft, display_name: event.target.value })}
                  />
                </label>
                <label>
                  Correo electrónico
                  <input
                    required
                    type="email"
                    value={profileDraft.email}
                    onChange={(event) => setProfileDraft({ ...profileDraft, email: event.target.value })}
                  />
                </label>
                <p className="photographer-setting-note">El usuario @{username} no se puede cambiar desde esta pantalla.</p>
                {error && <p className="notice notice-error" role="alert">{error}</p>}
                <div className="form-actions">
                  <button className="button button-primary" type="submit" disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                  <button className="button button-quiet" type="button" onClick={() => { setSettingsDialog(''); setError(''); }}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="photographer-account-limits">
                <p>El estado actual de tu cuenta y las condiciones de carga.</p>
                <div className="photographer-limit-row">
                  <span>Álbumes</span>
                  <strong>{albums.length} creados · sin límite de cantidad</strong>
                </div>
                <div className="photographer-limit-row">
                  <span>Fotos</span>
                  <strong>{photos.length} publicadas · sin límite de cantidad</strong>
                </div>
                <div className="photographer-limit-row">
                  <span>Tamaño por imagen</span>
                  <strong>Hasta 10 MB</strong>
                </div>
                <div className="photographer-limit-row">
                  <span>Formatos permitidos</span>
                  <strong>JPG, PNG, WEBP y GIF</strong>
                </div>
                <p className="photographer-setting-note">No hay una cuota de almacenamiento o cantidad de publicaciones configurada en el servidor.</p>
                <button className="button button-primary" type="button" onClick={() => setSettingsDialog('')}>
                  Entendido
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
