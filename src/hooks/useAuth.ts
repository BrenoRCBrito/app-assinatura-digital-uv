import { useEffect , useState } from "react";
import { useBiometrics } from "./useBiometrics";
import {
    hasAccount as checkHasAccount,
    registerAccount,
    verifyLogin,
    isBiometricsEnabled,
    setBiometricsEnabled,
} from '../services/auth'

export function useAuth(){
    const biometrics = useBiometrics();

    const [ isLoading , setIsLoading] = useState(true);
    const [hasAccount , setHasAccount] = useState(false);
    const [biometricsPreference , setBiometricsPreference] = useState(false);
    const [isAuthenticated , setIsAuthenticated] = useState(false);

    
    useEffect(() => {
        (async () => {
            const [accountExists, biometricsOn] = await Promise.all([
                checkHasAccount(),
                isBiometricsEnabled(),
            ]);
            setHasAccount(accountExists);
            setBiometricsPreference(biometricsOn);
            setIsLoading(false);
        })();
    }, []);

    async function register(name: string , email:string, password: string){
        await registerAccount(name , email , password);
        setHasAccount(true);
        setIsAuthenticated(true);
    }

    async function loginWithPassword(email: string , password:string){
        const success = await verifyLogin(email,password);
        setIsAuthenticated(success);
        return success;
    }

    async function loginWithBiometrics(){
        const success = await biometrics.authenticate();
        setIsAuthenticated(success);
        return success;
    }

    async function enableBiometricsPreference(){
        await setBiometricsEnabled(true);
        setBiometricsPreference(true);
    }

    function logout(){
        setIsAuthenticated(false);
        biometrics.logout();
    }

    return {
        isLoading,
        hasAccount,
        biometricsPreference,
        isAuthenticated,
        hasHardware: biometrics.hasHardware,
        isEnrolled: biometrics.isEnrolled,
        register,
        loginWithPassword,
        loginWithBiometrics,
        enableBiometricsPreference,
        logout,
    };
}