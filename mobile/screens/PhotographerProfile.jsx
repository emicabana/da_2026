import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getPhotos } from "../services/api";

export default function PhotographerProfile({ username, refreshKey, onUpload, onLogout }) {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        getPhotos()
            .then((allPhotos) => {
                if (active) {
                    setPhotos(allPhotos.filter((photo) => photo.owner_username === username));
                }
            })
            .catch((requestError) => {
                if (active) setError(requestError.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [username, refreshKey, retryKey]);

    return (
        <SafeAreaView>
            <FlatList
                data={photos}
                keyExtractor={(photo) => String(photo._id || photo.id)}
                numColumns={3}
                renderItem={({ item }) => (
                    <Image
                        source={{ uri: item.url }}
                        accessibilityLabel={item.title}
                    />
                )}
                ListHeaderComponent={(
                    <View>
                        <View>
                            <Text>MEMORIES</Text>
                            <Pressable onPress={onLogout}>
                                <Text>Cerrar sesión</Text>
                            </Pressable>
                        </View>
                        <View>
                            <Text>{username}</Text>
                            <Text>@{username}</Text>
                            <Text>{photos.length} fotos · Fotógrafo</Text>
                        </View>
                        <Pressable onPress={onUpload}>
                            <Text>＋ Subir fotos</Text>
                        </Pressable>
                        <Text>MIS FOTOS</Text>
                    </View>
                )}
                ListEmptyComponent={(
                    loading ? (
                        <View>
                            <ActivityIndicator />
                            <Text>Cargando tu perfil…</Text>
                        </View>
                    ) : error ? (
                        <View>
                            <Text accessibilityRole="alert">{error}</Text>
                            <Pressable onPress={() => setRetryKey((key) => key + 1)}>
                                <Text>Intentar de nuevo</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View>
                            <Text>Sin fotos</Text>
                            <Text>Empezá a armar tu perfil subiendo tu primera fotografía.</Text>
                            <Pressable onPress={onUpload}>
                                <Text>Subir mi primera foto</Text>
                            </Pressable>
                        </View>
                    )
                )}
            />
        </SafeAreaView>
    );
}
