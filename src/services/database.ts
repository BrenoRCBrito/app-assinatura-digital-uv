import { SQLiteDatabase } from "expo-sqlite";
import { SignedDocumentDraft , SignedDocumentRecord } from "../types/signature";

export async function initDatabase(db : SQLiteDatabase) : Promise<void>{
    await db.execAsync(
        `
            CREATE TABLE IF NOT EXISTS signed_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_name TEXT NOT NULL,
                signature_path TEXT NOT NULL,
                photo_uri TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                created_at TEXT NOT NULL
            );
        `);
}

export async function insertSignedDocument(
    db: SQLiteDatabase,
    doc: SignedDocumentDraft
): Promise<number> {
    const createdAt = new Date().toISOString();

    const result = await db.runAsync(
        `
            INSERT INTO signed_documents (document_name , signature_path , photo_uri , 
            latitude , longitude , created_at)

            VALUES (? , ? , ? , ? , ?  , ?)`,
            doc.documentName,
            doc.signaturePath,
            doc.photoUri,
            doc.latitude,
            doc.longitude,
            createdAt

    );

    return result.lastInsertRowId;
}


export async function listSignedDocuments(db: SQLiteDatabase): Promise<SignedDocumentRecord[]>{
    return db.getAllAsync<SignedDocumentRecord>(
        'SELECT * FROM signed_documents ORDER BY created_at DESC'
    )
}