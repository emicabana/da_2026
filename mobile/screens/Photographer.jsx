import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Screen from '../components/Screen';
import Button from '../components/Button';
import useApi from '../services/useApi';
import useGlobal from '../services/useGlobal';
import useProject from '../services/useProject';
import styles from '../style';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const today = new Date().toISOString().slice(0, 10);
const emptyAlbum = { name: '', date: today, category: '', description: '' };
const emptyPhoto = { title: '', description: '', price: '0', album_id: '' };
const emptyCoupon = { code: '', discount_type: 'percentage', value: '' };
const emptyStudio = { description: '', location: '', website: '', instagram: '' };
const emptyQuantityDiscount = {
  album_id: '',
  name: '',
  description: '',
  content_type: 'photos',
  min_quantity: '5',
  discount_percent: '10',
};
const watermarkRows = [0, 1, 2, 3];

const sectionTitles = {
  PhotographerProfile: 'Álbumes y perfil',
  PhotographerPhotos: 'Fotografías',
  PhotographerSales: 'Ventas',
  PhotographerDiscounts: 'Descuentos y paquetes',
  PhotographerCoupons: 'Cupones',
  PhotographerCollaborators: 'Colaboradores',
  PhotographerBilling: 'Facturación',
  PhotographerStudio: 'Studio',
};

function idOf(item) {
  return String(item?._id || item?.id || '');
}

function appendImage(form, key, asset) {
  form.append(key, {
    uri: asset.uri,
    name: asset.fileName || `${key}.jpg`,
    type: asset.mimeType || 'image/jpeg',
  });
}

function WatermarkedPhoto({ uri }) {
  return (
    <View style={styles.imageFrame}>
      <Image source={{ uri }} style={styles.imageInFrame} resizeMode="cover" />
      <View pointerEvents="none" style={styles.watermarkOverlay}>
        <View style={styles.watermarkPattern}>
          {watermarkRows.map((row) => (
            <View key={row} style={styles.watermarkRow}>
              <Text style={styles.watermarkRepeatText}>revela</Text>
              <Text style={styles.watermarkRepeatText}>revela</Text>
              <Text style={styles.watermarkRepeatText}>revela</Text>
            </View>
          ))}
        </View>
        <Text style={styles.watermarkCenterText}>◎ revela</Text>
      </View>
    </View>
  );
}

function LabeledInput({ label, value, onChangeText, ...props }) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.field}
        value={value == null ? '' : String(value)}
        onChangeText={onChangeText}
        placeholderTextColor="#6e7186"
        {...props}
      />
    </>
  );
}

function AlbumSelector({ albums, value, onChange, includeNone = false }) {
  return (
    <View style={[styles.row, { flexWrap: 'wrap' }]}>
      {includeNone ? (
        <Button
          label="Sin álbum"
          variant={value ? 'secondary' : undefined}
          onPress={() => onChange('')}
        />
      ) : null}
      {albums.map((album) => (
        <Button
          key={idOf(album)}
          label={album.name}
          variant={value === idOf(album) ? undefined : 'secondary'}
          onPress={() => onChange(idOf(album))}
        />
      ))}
    </View>
  );
}

export default function Photographer({ route }) {
  const api = useApi();
  const project = useProject();
  const { role, username } = useGlobal();
  const section = route.name;
  const [data, setData] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cover, setCover] = useState(null);
  const [photoImage, setPhotoImage] = useState(null);
  const [editingPhotoId, setEditingPhotoId] = useState('');
  const [albumForm, setAlbumForm] = useState({ ...emptyAlbum });
  const [photoForm, setPhotoForm] = useState({ ...emptyPhoto });
  const [couponForm, setCouponForm] = useState({ ...emptyCoupon });
  const [quantityDiscountForm, setQuantityDiscountForm] = useState({ ...emptyQuantityDiscount });
  const [collaboratorForm, setCollaboratorForm] = useState({ email: '', permission_level: 'event', album_id: '' });
  const [studioForm, setStudioForm] = useState({ ...emptyStudio });
  const [offerForms, setOfferForms] = useState({});

  async function loadSection() {
    setLoading(true);
    setError('');
    try {
      if (section === 'PhotographerProfile') {
        const result = await project.getAlbums();
        setData(Array.isArray(result) ? result : []);
      } else if (section === 'PhotographerPhotos') {
        const [photoList, albumList] = await Promise.all([project.getPhotos(), project.getAlbums()]);
        const ownedPhotos = role === 'admin'
          ? photoList
          : photoList.filter((photo) => photo.owner_username === username);
        setData(Array.isArray(ownedPhotos) ? ownedPhotos : []);
        setAlbums(Array.isArray(albumList) ? albumList : []);
      } else if (section === 'PhotographerSales' || section === 'PhotographerBilling') {
        const result = await project.getSales();
        setData(Array.isArray(result) ? result : []);
      } else if (section === 'PhotographerDiscounts') {
        const result = await project.getAlbums();
        const albumList = Array.isArray(result) ? result : [];
        setData(albumList);
        setOfferForms(Object.fromEntries(albumList.map((album) => [idOf(album), {
          photo_discount_percent: String(album.photo_discount_percent || 0),
          photo_discount_min_quantity: String(album.photo_discount_min_quantity || 1),
          photo_package_quantity: String(album.photo_package_quantity || 0),
          photo_package_price: String(album.photo_package_price || 0),
          video_discount_percent: String(album.video_discount_percent || 0),
          video_discount_min_quantity: String(album.video_discount_min_quantity || 1),
          video_package_quantity: String(album.video_package_quantity || 0),
          video_package_price: String(album.video_package_price || 0),
        }])));
      } else if (section === 'PhotographerCoupons') {
        const [couponList, albumList] = await Promise.all([project.getCoupons(), project.getAlbums()]);
        setData(Array.isArray(couponList) ? couponList : []);
        setAlbums(Array.isArray(albumList) ? albumList : []);
      } else if (section === 'PhotographerCollaborators') {
        const [list, invitations, albumList] = await Promise.all([
          project.getCollaborators(),
          project.getCollaborations(),
          project.getAlbums(),
        ]);
        setData(Array.isArray(list) ? list : []);
        setIncoming(Array.isArray(invitations) ? invitations : []);
        setAlbums(Array.isArray(albumList) ? albumList : []);
      } else if (section === 'PhotographerStudio') {
        const result = await project.getStudio();
        setStudioForm({
          description: result.description || '',
          location: result.location || '',
          website: result.website || '',
          instagram: result.instagram || '',
        });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar esta sección.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMessage('');
    loadSection();
  }, [section]);

  async function chooseImage(setImage) {
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]) setImage(result.assets[0]);
    } catch (pickerError) {
      setError(pickerError instanceof Error ? pickerError.message : 'No se pudo abrir la galería de imágenes.');
    }
  }

  async function createAlbum() {
    if (!cover) {
      setError('Seleccioná una portada para el álbum.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const form = new FormData();
      Object.entries({
        ...albumForm,
        photo_price: '0',
        video_price: '0',
      }).forEach(([key, value]) => form.append(key, String(value)));
      appendImage(form, 'cover', cover);
      await project.createAlbum(form);
      setAlbumForm({ ...emptyAlbum });
      setCover(null);
      setMessage('El álbum se creó correctamente.');
      await loadSection();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo crear el álbum.');
    } finally {
      setSaving(false);
    }
  }

  async function savePhoto() {
    if (!editingPhotoId && !photoImage) {
      setError('Seleccioná una fotografía para publicar.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (editingPhotoId && !photoImage) {
        await project.updatePhoto(editingPhotoId, {
          ...photoForm,
          price: Number(photoForm.price),
          album_id: photoForm.album_id,
        });
      } else {
        const form = new FormData();
        Object.entries(photoForm).forEach(([key, value]) => {
          if (value !== '' || (editingPhotoId && key === 'album_id')) {
            form.append(key, key === 'price' ? String(Number(value)) : value);
          }
        });
        appendImage(form, 'image', photoImage);
        if (editingPhotoId) await project.updatePhotoWithImage(editingPhotoId, form);
        else await project.uploadPhoto(form);
      }
      setPhotoForm({ ...emptyPhoto });
      setPhotoImage(null);
      setEditingPhotoId('');
      setMessage(editingPhotoId ? 'La fotografía se actualizó con marca de agua Revela.' : 'La fotografía se publicó con marca de agua Revela.');
      await loadSection();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo publicar la fotografía.');
    } finally {
      setSaving(false);
    }
  }

  function editPhoto(photo) {
    setEditingPhotoId(idOf(photo));
    setPhotoForm({
      title: photo.title || '',
      description: photo.description || '',
      price: String(photo.price ?? ''),
      album_id: String(photo.album_id?._id || photo.album_id || ''),
    });
    setPhotoImage(null);
    setError('');
    setMessage('');
  }

  function confirmDelete(type, item) {
    const itemName = item.title || item.name || item.code || 'este elemento';
    Alert.alert(`Eliminar ${type}`, `¿Querés eliminar ${itemName}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setError('');
          try {
            if (type === 'álbum') await project.deleteAlbum(idOf(item));
            else if (type === 'fotografía') await project.deletePhoto(idOf(item));
            else if (type === 'cupón') await project.deleteCoupon(idOf(item));
            else await project.deleteCollaborator(idOf(item));
            setMessage(`Se eliminó ${type}.`);
            await loadSection();
          } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : `No se pudo eliminar ${type}.`);
          }
        },
      },
    ]);
  }

  async function createCoupon() {
    setSaving(true);
    setError('');
    try {
      await project.createCoupon({
        ...couponForm,
        value: Number(couponForm.value),
      });
      setCouponForm({ ...emptyCoupon });
      setMessage('El cupón se creó correctamente.');
      await loadSection();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo crear el cupón.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleCoupon(coupon) {
    setError('');
    try {
      await project.updateCoupon(idOf(coupon), { active: !coupon.active });
      await loadSection();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el cupón.');
    }
  }

  async function createCollaborator() {
    setSaving(true);
    setError('');
    try {
      await project.createCollaborator({
        email: collaboratorForm.email.trim(),
        permission_level: collaboratorForm.permission_level,
        ...(collaboratorForm.permission_level === 'event' ? { album_id: collaboratorForm.album_id } : {}),
      });
      setCollaboratorForm({ email: '', permission_level: 'event', album_id: '' });
      setMessage('La invitación se envió correctamente.');
      await loadSection();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo invitar al colaborador.');
    } finally {
      setSaving(false);
    }
  }

  async function respondToInvite(invitation, response) {
    setError('');
    try {
      await project.respondToCollaboration(idOf(invitation), response);
      await loadSection();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'No se pudo responder la invitación.');
    }
  }

  async function saveStudio() {
    setSaving(true);
    setError('');
    try {
      await project.updateStudio(studioForm);
      setMessage('El perfil de Studio se guardó correctamente.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el perfil de Studio.');
    } finally {
      setSaving(false);
    }
  }

  async function saveOffers(album) {
    const albumId = idOf(album);
    const values = offerForms[albumId];
    setError('');
    try {
      const offers = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value || 0)]));
      await project.updateAlbumOffers(albumId, offers);
      setMessage(`Se actualizaron las ofertas de ${album.name}.`);
      await loadSection();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudieron guardar los descuentos.');
    }

    async function createQuantityDiscount() {
      if (!quantityDiscountForm.album_id) {
        setError('Seleccioná el álbum al que se aplicará el descuento.');
        return;
      }
      setSaving(true);
      setError('');
      try {
        await project.createQuantityDiscount(quantityDiscountForm.album_id, {
          name: quantityDiscountForm.name,
          description: quantityDiscountForm.description,
          content_type: quantityDiscountForm.content_type,
          tiers: [{
            min_quantity: Number(quantityDiscountForm.min_quantity),
            discount_percent: Number(quantityDiscountForm.discount_percent),
          }],
        });
        setQuantityDiscountForm((current) => ({ ...emptyQuantityDiscount, album_id: current.album_id }));
        setMessage('El descuento por cantidad se creó correctamente.');
        await loadSection();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'No se pudo crear el descuento.');
      } finally {
        setSaving(false);
      }
    }

    async function toggleQuantityDiscount(album, discount) {
      setError('');
      try {
        await project.updateQuantityDiscount(idOf(album), idOf(discount), { active: !discount.active });
        await loadSection();
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el descuento.');
      }
    }

    async function deleteQuantityDiscount(album, discount) {
      setError('');
      try {
        await project.deleteQuantityDiscount(idOf(album), idOf(discount));
        setMessage('Se eliminó el descuento por cantidad.');
        await loadSection();
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el descuento.');
      }
    }
  }

  const title = sectionTitles[section] || 'Panel de fotógrafo';
  const totalSales = data.reduce((sum, order) => sum + (Number(order.total) || 0), 0);

  return (
    <Screen title={title}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 28 }}>
        <Text style={styles.bodyText}>Administrá tu actividad fotográfica desde Revela.</Text>
        {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
        {message ? <Text style={styles.successText}>{message}</Text> : null}

        {section === 'PhotographerProfile' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.buttonText}>Crear álbum</Text>
              <LabeledInput label="Nombre del evento" value={albumForm.name} onChangeText={(value) => setAlbumForm({ ...albumForm, name: value })} maxLength={100} placeholder="Ej. Festival de verano" />
              <LabeledInput label="Fecha" value={albumForm.date} onChangeText={(value) => setAlbumForm({ ...albumForm, date: value })} placeholder="AAAA-MM-DD" />
              <LabeledInput label="Categoría" value={albumForm.category} onChangeText={(value) => setAlbumForm({ ...albumForm, category: value })} maxLength={50} placeholder="Concierto, boda…" />
              <LabeledInput label="Descripción" value={albumForm.description} onChangeText={(value) => setAlbumForm({ ...albumForm, description: value })} multiline maxLength={1000} placeholder="Contá de qué se trata el evento" />
              {cover ? <Image source={{ uri: cover.uri }} style={styles.image} resizeMode="cover" /> : null}
              <Button label={cover ? 'Cambiar portada' : 'Elegir portada'} variant="secondary" onPress={() => chooseImage(setCover)} />
              <Button label={saving ? 'Creando…' : 'Crear álbum'} onPress={createAlbum} disabled={saving} />
            </View>
            <Text style={[styles.buttonText, { marginTop: 16 }]}>Mis álbumes ({data.length})</Text>
            {data.map((album) => (
              <View key={idOf(album)} style={styles.card}>
                {album.cover_url ? <Image source={{ uri: api.mediaUrl(album.cover_url) }} style={styles.image} resizeMode="cover" /> : null}
                <Text style={styles.buttonText}>{album.name}</Text>
                <Text style={styles.mutedText}>{album.category} · {album.date ? new Date(album.date).toLocaleDateString('es-AR') : ''}</Text>
                <Text style={styles.bodyText}>{album.description}</Text>
                <Button label="Eliminar álbum" variant="danger" onPress={() => confirmDelete('álbum', album)} />
              </View>
            ))}
          </>
        ) : null}

        {section === 'PhotographerPhotos' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.buttonText}>Publicar fotografía</Text>
              <LabeledInput label="Título" value={photoForm.title} onChangeText={(value) => setPhotoForm({ ...photoForm, title: value })} placeholder="Título de la foto" />
              <LabeledInput label="Descripción" value={photoForm.description} onChangeText={(value) => setPhotoForm({ ...photoForm, description: value })} multiline placeholder="Descripción opcional" />
              <LabeledInput label="Precio (ARS)" value={photoForm.price} onChangeText={(value) => setPhotoForm({ ...photoForm, price: value })} keyboardType="decimal-pad" placeholder="0" />
              <Text style={styles.fieldLabel}>Álbum (opcional)</Text>
              <AlbumSelector albums={albums} value={photoForm.album_id} onChange={(album_id) => setPhotoForm({ ...photoForm, album_id })} includeNone />
              {photoImage ? <WatermarkedPhoto uri={photoImage.uri} /> : null}
              <View style={styles.watermarkBadge}>
                <Text style={styles.watermarkBadgeText}>◎ Marca de agua Revela aplicada automáticamente</Text>
              </View>
              <Button label={photoImage ? 'Cambiar imagen' : editingPhotoId ? 'Reemplazar imagen (opcional)' : 'Elegir imagen'} variant="secondary" onPress={() => chooseImage(setPhotoImage)} />
              <Button label={saving ? 'Guardando…' : editingPhotoId ? 'Guardar cambios' : 'Publicar fotografía'} onPress={savePhoto} disabled={saving} />
              {editingPhotoId ? <Button label="Cancelar edición" variant="secondary" onPress={() => { setEditingPhotoId(''); setPhotoImage(null); setPhotoForm({ ...emptyPhoto }); }} /> : null}
            </View>
            <Text style={[styles.buttonText, { marginTop: 16 }]}>Fotografías ({data.length})</Text>
            {data.map((photo) => (
              <View key={idOf(photo)} style={styles.card}>
                {photo.url ? <WatermarkedPhoto uri={api.mediaUrl(photo.url)} /> : null}
                <Text style={styles.buttonText}>{photo.title}</Text>
                <Text style={styles.mutedText}>{money.format(Number(photo.price) || 0)}</Text>
                <View style={styles.watermarkBadge}>
                  <Text style={styles.watermarkBadgeText}>◎ Con marca de agua Revela</Text>
                </View>
                <Button label="Editar fotografía" variant="secondary" onPress={() => editPhoto(photo)} />
                <Button label="Eliminar fotografía" variant="danger" onPress={() => confirmDelete('fotografía', photo)} />
              </View>
            ))}
          </>
        ) : null}

        {section === 'PhotographerSales' || section === 'PhotographerBilling' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.mutedText}>{section === 'PhotographerBilling' ? 'Ventas registradas' : 'Ingresos registrados'}</Text>
              <Text style={[styles.buttonText, { fontSize: 24, marginTop: 6 }]}>{money.format(totalSales)}</Text>
              <Text style={styles.mutedText}>{data.length} pedidos con tus fotografías</Text>
            </View>
            {data.map((order, index) => (
              <View key={idOf(order) || index} style={styles.card}>
                <Text style={styles.buttonText}>Pedido {idOf(order).slice(-8)}</Text>
                <Text style={styles.bodyText}>Cliente: {order.customer?.display_name || order.username || '—'}</Text>
                <Text style={styles.bodyText}>Total asociado: {money.format(Number(order.total) || 0)}</Text>
                <Text style={styles.mutedText}>Estado: {order.status || 'Pendiente'} · {Array.isArray(order.photos) ? order.photos.length : 0} fotos</Text>
              </View>
            ))}
          </>
        ) : null}

        {section === 'PhotographerDiscounts' ? data.map((album) => {
          const albumId = idOf(album);
          const values = offerForms[albumId] || {};
          const update = (key, value) => setOfferForms((current) => ({
            ...current,
            [albumId]: { ...current[albumId], [key]: value },
          }));
          return (
            <View key={albumId} style={styles.card}>
              <Text style={styles.buttonText}>{album.name}</Text>
              <Text style={styles.fieldLabel}>Descuento de fotos (%)</Text>
              <TextInput style={styles.field} value={values.photo_discount_percent} onChangeText={(value) => update('photo_discount_percent', value)} keyboardType="decimal-pad" />
              <Text style={styles.fieldLabel}>Cantidad mínima</Text>
              <TextInput style={styles.field} value={values.photo_discount_min_quantity} onChangeText={(value) => update('photo_discount_min_quantity', value)} keyboardType="number-pad" />
              <Text style={styles.fieldLabel}>Fotos por paquete (0 desactiva)</Text>
              <TextInput style={styles.field} value={values.photo_package_quantity} onChangeText={(value) => update('photo_package_quantity', value)} keyboardType="number-pad" />
              <Text style={styles.fieldLabel}>Precio del paquete (ARS)</Text>
              <TextInput style={styles.field} value={values.photo_package_price} onChangeText={(value) => update('photo_package_price', value)} keyboardType="decimal-pad" />
              <Button label="Guardar ofertas" onPress={() => saveOffers(album)} />
              {(album.quantity_discounts || []).map((discount) => (
                <View key={idOf(discount)} style={[styles.card, { marginHorizontal: 0 }]}>
                  <Text style={styles.buttonText}>{discount.name}</Text>
                  <Text style={styles.mutedText}>
                    {discount.content_type === 'videos' ? 'Videos' : 'Fotos'} · {(discount.tiers || []).map((tier) => `${tier.min_quantity}+ · ${tier.discount_percent}%`).join(', ')}
                  </Text>
                  <View style={styles.row}>
                    <View style={styles.flex}><Button label={discount.active ? 'Desactivar' : 'Activar'} variant="secondary" onPress={() => toggleQuantityDiscount(album, discount)} /></View>
                    <View style={styles.flex}><Button label="Eliminar" variant="danger" onPress={() => deleteQuantityDiscount(album, discount)} /></View>
                  </View>
                </View>
              ))}
            </View>
          );
        }) : null}

        {section === 'PhotographerDiscounts' ? (
          <View style={styles.card}>
            <Text style={styles.buttonText}>Descuento por cantidad</Text>
            <Text style={styles.fieldLabel}>Álbum</Text>
            <AlbumSelector
              albums={data}
              value={quantityDiscountForm.album_id}
              onChange={(album_id) => setQuantityDiscountForm({ ...quantityDiscountForm, album_id })}
            />
            <LabeledInput label="Nombre" value={quantityDiscountForm.name} onChangeText={(value) => setQuantityDiscountForm({ ...quantityDiscountForm, name: value })} maxLength={50} placeholder="Ej. Pack de fotos" />
            <LabeledInput label="Descripción (opcional)" value={quantityDiscountForm.description} onChangeText={(value) => setQuantityDiscountForm({ ...quantityDiscountForm, description: value })} maxLength={250} placeholder="Descripción" />
            <View style={styles.row}>
              <View style={styles.flex}><Button label="Fotos" variant={quantityDiscountForm.content_type === 'photos' ? undefined : 'secondary'} onPress={() => setQuantityDiscountForm({ ...quantityDiscountForm, content_type: 'photos' })} /></View>
              <View style={styles.flex}><Button label="Videos" variant={quantityDiscountForm.content_type === 'videos' ? undefined : 'secondary'} onPress={() => setQuantityDiscountForm({ ...quantityDiscountForm, content_type: 'videos' })} /></View>
            </View>
            <LabeledInput label="Cantidad mínima" value={quantityDiscountForm.min_quantity} onChangeText={(value) => setQuantityDiscountForm({ ...quantityDiscountForm, min_quantity: value })} keyboardType="number-pad" />
            <LabeledInput label="Descuento (%)" value={quantityDiscountForm.discount_percent} onChangeText={(value) => setQuantityDiscountForm({ ...quantityDiscountForm, discount_percent: value })} keyboardType="decimal-pad" />
            <Button label={saving ? 'Creando…' : 'Crear descuento'} onPress={createQuantityDiscount} disabled={saving} />
          </View>
        ) : null}

        {section === 'PhotographerCoupons' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.buttonText}>Crear cupón</Text>
              <LabeledInput label="Código" value={couponForm.code} onChangeText={(value) => setCouponForm({ ...couponForm, code: value.toUpperCase() })} autoCapitalize="characters" maxLength={30} placeholder="VERANO10" />
              <Text style={styles.fieldLabel}>Tipo de descuento</Text>
              <View style={styles.row}>
                {['percentage', 'fixed'].map((type) => (
                  <View key={type} style={styles.flex}>
                    <Button label={type === 'percentage' ? 'Porcentaje' : 'Importe fijo'} variant={couponForm.discount_type === type ? undefined : 'secondary'} onPress={() => setCouponForm({ ...couponForm, discount_type: type })} />
                  </View>
                ))}
              </View>
              <LabeledInput label={couponForm.discount_type === 'percentage' ? 'Descuento (%)' : 'Descuento (ARS)'} value={couponForm.value} onChangeText={(value) => setCouponForm({ ...couponForm, value })} keyboardType="decimal-pad" placeholder="10" />
              <Button label={saving ? 'Creando…' : 'Crear cupón'} onPress={createCoupon} disabled={saving} />
            </View>
            {data.map((coupon) => (
              <View key={idOf(coupon)} style={styles.card}>
                <Text style={styles.buttonText}>{coupon.code}</Text>
                <Text style={styles.bodyText}>{coupon.discount_type === 'percentage' ? `${coupon.value}%` : money.format(Number(coupon.value) || 0)} de descuento</Text>
                <Text style={styles.mutedText}>{coupon.active ? 'Activo' : 'Inactivo'}</Text>
                <View style={styles.row}>
                  <View style={styles.flex}><Button label={coupon.active ? 'Desactivar' : 'Activar'} variant="secondary" onPress={() => toggleCoupon(coupon)} /></View>
                  <View style={styles.flex}><Button label="Eliminar" variant="danger" onPress={() => confirmDelete('cupón', coupon)} /></View>
                </View>
              </View>
            ))}
          </>
        ) : null}

        {section === 'PhotographerCollaborators' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.buttonText}>Invitar fotógrafo</Text>
              <LabeledInput label="Correo de la cuenta" value={collaboratorForm.email} onChangeText={(value) => setCollaboratorForm({ ...collaboratorForm, email: value })} keyboardType="email-address" autoCapitalize="none" placeholder="fotografo@correo.com" />
              <View style={styles.row}>
                <View style={styles.flex}><Button label="Un álbum" variant={collaboratorForm.permission_level === 'event' ? undefined : 'secondary'} onPress={() => setCollaboratorForm({ ...collaboratorForm, permission_level: 'event' })} /></View>
                <View style={styles.flex}><Button label="Acceso total" variant={collaboratorForm.permission_level === 'full' ? undefined : 'secondary'} onPress={() => setCollaboratorForm({ ...collaboratorForm, permission_level: 'full', album_id: '' })} /></View>
              </View>
              {collaboratorForm.permission_level === 'event' ? (
                <>
                  <Text style={styles.fieldLabel}>ID del álbum</Text>
                  <TextInput style={styles.field} value={collaboratorForm.album_id} onChangeText={(value) => setCollaboratorForm({ ...collaboratorForm, album_id: value })} placeholder="Copiá el ID del álbum" placeholderTextColor="#6e7186" autoCapitalize="none" />
                  {albums.map((album) => <Text key={idOf(album)} style={styles.mutedText}>{album.name} · {idOf(album)}</Text>)}
                </>
              ) : null}
              <Button label={saving ? 'Enviando…' : 'Enviar invitación'} onPress={createCollaborator} disabled={saving} />
            </View>
            <Text style={[styles.buttonText, { marginTop: 14 }]}>Invitaciones recibidas</Text>
            {incoming.map((invite) => (
              <View key={idOf(invite)} style={styles.card}>
                <Text style={styles.bodyText}>De @{invite.owner_username} · {invite.album_id?.name || 'Acceso total'}</Text>
                <Text style={styles.mutedText}>Estado: {invite.status}</Text>
                {invite.status === 'pending' ? (
                  <View style={styles.row}>
                    <View style={styles.flex}><Button label="Aceptar" onPress={() => respondToInvite(invite, 'accepted')} /></View>
                    <View style={styles.flex}><Button label="Rechazar" variant="secondary" onPress={() => respondToInvite(invite, 'declined')} /></View>
                  </View>
                ) : null}
              </View>
            ))}
            <Text style={[styles.buttonText, { marginTop: 14 }]}>Colaboraciones ({data.length})</Text>
            {data.map((collaborator) => (
              <View key={idOf(collaborator)} style={styles.card}>
                <Text style={styles.bodyText}>@{collaborator.collaborator_username} · {collaborator.album_id?.name || 'Todos los álbumes'}</Text>
                <Text style={styles.mutedText}>{collaborator.invite_email} · {collaborator.status}</Text>
                <Button label="Quitar colaboración" variant="danger" onPress={() => confirmDelete('colaborador', collaborator)} />
              </View>
            ))}
          </>
        ) : null}

        {section === 'PhotographerStudio' ? (
          <View style={styles.card}>
            <Text style={styles.buttonText}>Perfil profesional</Text>
            <LabeledInput label="Descripción" value={studioForm.description} onChangeText={(value) => setStudioForm({ ...studioForm, description: value })} multiline maxLength={500} placeholder="Contá tu propuesta fotográfica" />
            <LabeledInput label="Ubicación" value={studioForm.location} onChangeText={(value) => setStudioForm({ ...studioForm, location: value })} maxLength={120} placeholder="Ciudad, país" />
            <LabeledInput label="Sitio web" value={studioForm.website} onChangeText={(value) => setStudioForm({ ...studioForm, website: value })} keyboardType="url" autoCapitalize="none" maxLength={200} placeholder="https://" />
            <LabeledInput label="Instagram" value={studioForm.instagram} onChangeText={(value) => setStudioForm({ ...studioForm, instagram: value })} autoCapitalize="none" maxLength={60} placeholder="@usuario" />
            <Button label={saving ? 'Guardando…' : 'Guardar perfil'} onPress={saveStudio} disabled={saving} />
          </View>
        ) : null}

        {loading ? <Text style={styles.mutedText}>Cargando…</Text> : null}
        {!loading && !data.length && ['PhotographerProfile', 'PhotographerPhotos', 'PhotographerSales', 'PhotographerBilling', 'PhotographerDiscounts', 'PhotographerCoupons', 'PhotographerCollaborators'].includes(section)
          ? <Text style={styles.mutedText}>Todavía no hay elementos para mostrar.</Text>
          : null}
        <Pressable onPress={loadSection} accessibilityRole="button" style={{ alignSelf: 'flex-start', marginTop: 16 }}>
          <Text style={{ color: '#c39aff', fontWeight: '700' }}>Actualizar esta sección</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
