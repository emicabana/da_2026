import { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createPhoto } from "../services/api";
import TextField from "../components/TextField";

export default function UploadPhoto({ token, onBack, onUploaded }) {
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit() {
        setError("");
        if (!title.trim() || !url.trim() || price === "") {
            setError("Completá el título, el enlace de la imagen y el precio.");
            return;
        }
        let imageUrl;
        try {
            imageUrl = new URL(url.trim());
        } catch {
            setError("Ingresá un enlace válido para la imagen.");
            return;
        }
        if (!["http:", "https:"].includes(imageUrl.protocol)) {
            setError("El enlace de la imagen debe comenzar con http:// o https://.");
            return;
        }
        const numericPrice = Number(price);
        if (!Number.isFinite(numericPrice) || numericPrice < 0) {
            setError("Ingresá un precio válido, igual o mayor a cero.");
            return;
        }

        setSaving(true);
        try {
            await createPhoto(token, {
                title: title.trim(),
                url: imageUrl.toString(),
                description: description.trim(),
                price: numericPrice,
            });
            onUploaded();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <SafeAreaView>
            <ScrollView keyboardShouldPersistTaps="handled">
                <View>
                    <Pressable onPress={onBack} accessibilityLabel="Volver al perfil">
                        <Text>‹ Volver</Text>
                    </Pressable>
                    <Text>Subir foto</Text>
                </View>
                <Text>Agregá el enlace público de la imagen para publicarla en tu perfil.</Text>
                <TextField
                    label="Título"
                    placeholder="Ej. Atardecer en la costa"
                    value={title}
                    onChangeText={setTitle}
                    maxLength={100}
                />
                <TextField
                    label="Enlace de la imagen"
                    placeholder="https://..."
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                />
                <View>
                    <Text>Descripción (opcional)</Text>
                    <TextInput
                        placeholder="Contá brevemente sobre esta foto"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        maxLength={500}
                    />
                </View>
                <TextField
                    label="Precio (ARS)"
                    placeholder="0"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                />
                <Text>La foto se publicará en tu perfil y quedará asociada a tu cuenta.</Text>
                {error ? <Text accessibilityRole="alert">{error}</Text> : null}
                <Pressable onPress={handleSubmit} disabled={saving}>
                    {saving ? <ActivityIndicator /> : <Text>Publicar foto</Text>}
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}
