export type RootStackParamList = {
    Login: undefined;
    Home: undefined;
    Signature: {documentName: string};
    Camera: {documentName: string ; signaturePath: string};
    Location: {documentName: string ; signaturePath: string ; photoUri: string};
    Receipt: {
        documentName: string;
        signaturePath: string;
        photoUri: string;
        latitude: number;
        longitude: number;
    };
};