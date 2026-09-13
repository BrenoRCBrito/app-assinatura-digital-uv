import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto'

const ACCOUNT_KEY = '@assina_aqui:account';
const BIOMETRICS_KEY = '@assina_aqui:biometricsEnabled';

interface StoredAccount{
    name: string;
    email: string;
    passwordHash: string;
}

async function hashPassword(password : string): Promise<string> {
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
}

export async function hasAccount(): Promise<boolean> {
    const raw = await AsyncStorage.getItem(ACCOUNT_KEY);
    return raw !== null;
}

export async function registerAccount(name: string , email:string , password: string) : Promise<void>{
    const passwordHash = await hashPassword(password);
    const account: StoredAccount = {name , email , passwordHash};
    await AsyncStorage.setItem(ACCOUNT_KEY , JSON.stringify(account));
}

export async function verifyLogin(email: string , password:string):  Promise<boolean> {
    const raw = await AsyncStorage.getItem(ACCOUNT_KEY);
    if(!raw){
        return false;
    }

    const account: StoredAccount = JSON.parse(raw);
    const passwordHash = await hashPassword(password);

    return account.email === email && account.passwordHash === passwordHash;
}

export async function isBiometricsEnabled(): Promise<boolean>{
    const value = await AsyncStorage.getItem(BIOMETRICS_KEY);
    return value === 'true';
}

export async function setBiometricsEnabled(enabled: boolean): Promise<void>{
    await AsyncStorage.setItem(BIOMETRICS_KEY, enabled ? 'true' : 'false');
}

