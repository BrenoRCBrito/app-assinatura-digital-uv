
export interface SignedDocumentDraft{
    documentName: string;
    signaturePath: string;
    photoUri: string;
    latitude: number;
    longitude: number;
}

export interface SignedDocumentRecord {
    id: number;
    document_name: string;
    signature_path: string;
    photo_uri: string;
    latitude: number;
    longitude: number;
    created_at: string;
}