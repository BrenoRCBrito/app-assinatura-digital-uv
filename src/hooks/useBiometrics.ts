import {useState, useEffect} from 'react'
import {verificandoBiometriaHardware , verificandoBiometriaCadastrada , autenticarComBiometria} from "../services/biometry"

export function useBiometrics(){
    const [hasHardware , setHasHardware] = useState(false);
    const [isEnrolled , setIsEnrolled] = useState(false);
    const [isAuthenticated , setIsAuthenticated] = useState(false);

    useEffect(() => {
        (async() =>{
            const compatible = await verificandoBiometriaHardware();
            setHasHardware(compatible);

            if(compatible){
                const enrolled  = await  verificandoBiometriaCadastrada();
                setIsEnrolled(enrolled);
            }
        
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
        isEnrolled,
        isAuthenticated,
        authenticate,
        logout,
    }
}