'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
  WriteBatch,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

function isPermissionDeniedError(error: any): boolean {
  if (!error) return false;
  if (error.code === 'permission-denied') return true;
  const msg = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return msg.includes('permission') || msg.includes('insufficient permissions');
}

/**
 * Initiates a setDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function setDocumentNonBlocking(docRef: DocumentReference | null | undefined, data: any, options?: SetOptions) {
  if (!docRef) return;
  (options ? setDoc(docRef, data, options) : setDoc(docRef, data)).catch(error => {
    console.error(error);
    if (isPermissionDeniedError(error)) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: options && 'merge' in options ? 'update' : 'write',
          requestResourceData: data,
        })
      );
    }
  });
  // Execution continues immediately
}


/**
 * Initiates an addDoc operation for a collection reference.
 * Does NOT await the write operation internally.
 * Returns the Promise for the new doc ref, but typically not awaited by caller.
 */
export function addDocumentNonBlocking(colRef: CollectionReference | null | undefined, data: any) {
  if (!colRef) return Promise.resolve(undefined);
  const promise = addDoc(colRef, data)
    .catch(error => {
      console.error(error);
      if (isPermissionDeniedError(error)) {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: colRef.path,
            operation: 'create',
            requestResourceData: data,
          })
        );
      }
    });
  return promise;
}


/**
 * Initiates an updateDoc operation for a document reference.
 * Does NOT await the write operation internally.
 * If document doesn't exist yet, gracefully falls back to setDoc with merge: true.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference | null | undefined, data: any) {
  if (!docRef) return;
  updateDoc(docRef, data)
    .catch(error => {
      const errorMsg = typeof error?.message === 'string' ? error.message : '';
      if (error?.code === 'not-found' || errorMsg.includes('No document to update')) {
        setDoc(docRef, data, { merge: true }).catch(fallbackError => {
          console.error(fallbackError);
          if (isPermissionDeniedError(fallbackError)) {
            errorEmitter.emit(
              'permission-error',
              new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: data,
              })
            );
          }
        });
        return;
      }

      console.error(error);
      if (isPermissionDeniedError(error)) {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: data,
          })
        );
      }
    });
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * Does NOT await the write operation internally.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference | null | undefined) {
  if (!docRef) return;
  deleteDoc(docRef)
    .catch(error => {
      console.error(error);
      if (isPermissionDeniedError(error)) {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
          })
        );
      }
    });
}

/**
 * Commits a write batch and handles permission errors globally.
 */
export function commitBatchNonBlocking(batch: WriteBatch) {
  return batch.commit().catch(error => {
    console.error(error);
    if (isPermissionDeniedError(error)) {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: 'batch-operation',
          operation: 'write'
        })
      );
    }
    throw error;
  });
}
