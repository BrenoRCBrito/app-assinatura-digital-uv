import {useState, useEffect} from 'react'
import {verificandoBiometriaHardware , autenticarComBiometria} from "../services/biometry"

export function useBiometrics(){
    const [hasHardware , setHasHardware] = useState(false);
    const [isAuthenticated , setIsAuthenticated] = useState(false);

    useEffect(() => {
        (async() =>{
            const compatible = await verificandoBiometriaHardware();
            setHasHardware(compatible);
        
        })();
    },[]);

    const authenticate = async () => {
        const success = await autenticarComBiometria();
        setIsAuthenticated(success);
        return success;
    }

    const logout = () => setIsAuthenticated(false);

    return{
        hasHardware,
        isAuthenticated,
        authenticate,
        logout,
    }
}