import * as LocalAuthentication from 'expo-local-authentication';

export async function   verificandoBiometriaHardware(): Promise<boolean> {
    return await LocalAuthentication.hasHardwareAsync();
}

export async function autenticarComBiometria(): Promise<boolean>{
    const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentique-se para acessar o aplicativo',
        fallbackLabel: 'Usar senha '
    })
    return resultado.success;
}