import Screen from "../components/screen";
import TextField from "../components/TextField";

export default function Login() {
    return <Screen 
        title="Login">
            <TextField
                label="Nombre de usuario"
                placeholder="Ingrese su nombre de usuario"
            />
            <TextField
                label="Contraseña"
                placeholder="Ingrese su contraseña"
                secureTextEntry={true}
            />
    </Screen>;
}