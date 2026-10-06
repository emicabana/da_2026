import { useEffect, useState } from 'react';
import { createPhoto, deletePhoto, getPhotos, updatePhoto } from '../services/api';

const emptyPhoto = { title: '', description: '', url: '', price: '' };
const formatPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

export default function PhotographerDashboard({ token, username }) {
  const [photos, setPhotos] = useState([]);
  const [draft, setDraft] = useState(emptyPhoto);
  const [editingId, setEditingId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    getPhotos()
      .then((allPhotos) => {
        if (active) setPhotos(allPhotos.filter((photo) => photo.owner_username === username));
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [token, username, refreshKey]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const photoData = { ...draft, price: Number(draft.price) };
    try {
      if (editingId) {
        await updatePhoto(token, editingId, photoData);
        setMessage('Foto actualizada.');
      } else {
        await createPhoto(token, photoData);
        setMessage('Foto publicada.');
      }
      setDraft(emptyPhoto);
      setEditingId('');
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
      url: photo.url || '',
      price: String(photo.price ?? ''),
    });
    setError('');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditing() {
    setEditingId('');
    setDraft(emptyPhoto);
    setError('');
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
      if (editingId === id) cancelEditing();
      setMessage('Foto eliminada.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId('');
    }
  }

  return (
    <section className="dashboard-stack" aria-labelledby="photographer-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ESTUDIO / @{username}</p>
          <h1 id="photographer-title">Tus fotografías</h1>
          <p className="heading-copy">Publicá y mantené actualizado tu catálogo.</p>
        </div>
        <span className="stat-chip">{photos.length} {photos.length === 1 ? 'foto publicada' : 'fotos publicadas'}</span>
      </div>

      <div className="dashboard-columns">
        <section className="surface editor-panel" aria-labelledby="photo-form-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CATÁLOGO</p>
              <h2 id="photo-form-title">{editingId ? 'Editar foto' : 'Nueva foto'}</h2>
            </div>
          </div>
          <form className="photo-form" onSubmit={handleSubmit}>
            <label>
              Título
              <input required maxLength={100} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ej. Atardecer en la costa" />
            </label>
            <label>
              Enlace de la imagen
              <input required type="url" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://..." />
            </label>
            <label>
              Descripción <span className="optional-label">Opcional</span>
              <textarea rows="3" maxLength={500} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Contá brevemente sobre esta foto" />
            </label>
            <label>
              Precio (ARS)
              <input required type="number" min="0" step="0.01" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="0" />
            </label>
            <div className="form-actions">
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Publicar foto'}
              </button>
              {editingId && <button className="button button-quiet" type="button" onClick={cancelEditing}>Cancelar</button>}
            </div>
          </form>
          <p className="form-note">Por ahora se publica mediante una URL pública de imagen. La carga directa de archivos todavía no está conectada.</p>
        </section>

        <section className="catalog-panel" aria-labelledby="my-photos-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PUBLICADAS</p>
              <h2 id="my-photos-title">Mi catálogo</h2>
            </div>
            <button className="button button-quiet button-small" type="button" onClick={() => { setLoading(true); setRefreshKey((key) => key + 1); }} disabled={loading}>Actualizar</button>
          </div>
          {loading ? <p className="empty-state">Cargando tus fotos…</p> : photos.length === 0 ? (
            <div className="empty-state"><strong>Tu catálogo está vacío.</strong><span>Publicá tu primera foto desde el formulario.</span></div>
          ) : (
            <div className="photo-grid photographer-grid">
              {photos.map((photo) => {
                const id = photo._id || photo.id;
                return (
                  <article className="photo-card" key={id}>
                    <img className="photo-image" src={photo.url} alt={photo.title} loading="lazy" />
                    <div className="photo-card-body">
                      <div className="photo-card-title"><h3>{photo.title}</h3><span>{formatPrice.format(photo.price)}</span></div>
                      {photo.description && <p className="photo-description">{photo.description}</p>}
                      <div className="photo-card-actions">
                        <button className="button button-quiet button-small" type="button" onClick={() => startEditing(photo)}>Editar</button>
                        <button className="button button-danger button-small" type="button" onClick={() => handleDelete(photo)} disabled={deletingId === id}>{deletingId === id ? 'Eliminando…' : 'Eliminar'}</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {message && <p className="notice notice-success" role="status">{message}</p>}
    </section>
  );
}
