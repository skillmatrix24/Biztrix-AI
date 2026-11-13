import firebaseConfig from '../../firebase-applet-config.json';

export const SERVER_TIMESTAMP_SENTINEL = { __serverTimestamp: true } as const;

const PROJECT_ID = firebaseConfig.projectId;
const API_KEY = firebaseConfig.apiKey;
const DATABASE_ID = '(default)';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

export function isPermissionDeniedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: unknown; message?: unknown };
  const msg = String(e.message || '');
  return (
    e.code === 7 ||
    e.code === '7' ||
    e.code === 'permission-denied' ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('Missing or insufficient permissions')
  );
}

function isServerTimestampSentinel(val: unknown): boolean {
  return Boolean(
    val &&
      typeof val === 'object' &&
      (val as Record<string, unknown>).__serverTimestamp === true
  );
}

function toFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { nullValue: null };
    return Number.isInteger(val)
      ? { integerValue: String(val) }
      : { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (val instanceof Date) {
    return { timestampValue: val.toISOString() };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val
          .filter((item) => item !== undefined && !isServerTimestampSentinel(item))
          .map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v === undefined || isServerTimestampSentinel(v)) continue;
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val: Record<string, unknown>): unknown {
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('stringValue' in val) return String(val.stringValue);
  if ('timestampValue' in val) return String(val.timestampValue);
  if ('arrayValue' in val) {
    const arr = (val.arrayValue as { values?: Record<string, unknown>[] })?.values || [];
    return arr.map(fromFirestoreValue);
  }
  if ('mapValue' in val) {
    const fields = (val.mapValue as { fields?: Record<string, Record<string, unknown>> })?.fields || {};
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

function extractFieldsAndTransforms(
  data: Record<string, unknown>,
  prefix = ''
): {
  fields: Record<string, unknown>;
  transforms: Array<{ fieldPath: string; setToServerValue: 'REQUEST_TIME' }>;
  fieldPaths: string[];
} {
  const fields: Record<string, unknown> = {};
  const transforms: Array<{ fieldPath: string; setToServerValue: 'REQUEST_TIME' }> = [];
  const fieldPaths: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (isServerTimestampSentinel(value)) {
      transforms.push({ fieldPath: fullPath, setToServerValue: 'REQUEST_TIME' });
      continue;
    }
    fields[key] = toFirestoreValue(value);
    fieldPaths.push(key);
  }

  return { fields, transforms, fieldPaths };
}

function buildHeaders(idToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }
  return headers;
}

function docName(docPath: string): string {
  const clean = docPath.replace(/^\/+/, '');
  return `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${clean}`;
}

export interface RestDocSnapshot {
  exists: boolean;
  id: string;
  updateTime?: string;
  data: () => Record<string, any> | undefined;
}

export async function restGetDoc(
  docPath: string,
  idToken?: string
): Promise<RestDocSnapshot> {
  const clean = docPath.replace(/^\/+/, '');
  const id = clean.split('/').pop() || '';
  const url = `${BASE_URL}/${clean}?key=${API_KEY}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(idToken),
    cache: 'no-store',
  });

  if (res.status === 404) {
    return { exists: false, id, data: () => undefined };
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore REST GET failed (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const parsed: Record<string, any> = {};
  if (json.fields) {
    for (const [k, v] of Object.entries(json.fields)) {
      parsed[k] = fromFirestoreValue(v as Record<string, unknown>);
    }
  }

  return {
    exists: true,
    id,
    updateTime: json.updateTime,
    data: () => parsed,
  };
}

export interface RestWriteOp {
  type: 'set' | 'update';
  path: string;
  data: Record<string, unknown>;
  currentDocument?: { exists?: boolean; updateTime?: string };
}

export async function restCommit(
  ops: RestWriteOp[],
  idToken?: string
): Promise<void> {
  const writes = ops.map((op) => {
    const { fields, transforms, fieldPaths } = extractFieldsAndTransforms(op.data);
    const writeObj: Record<string, unknown> = {
      update: {
        name: docName(op.path),
        fields,
      },
    };

    if (op.type === 'update') {
      writeObj.updateMask = { fieldPaths };
      writeObj.currentDocument = op.currentDocument || { exists: true };
    } else if (op.currentDocument) {
      writeObj.currentDocument = op.currentDocument;
    }

    if (transforms.length > 0) {
      writeObj.updateTransforms = transforms;
    }

    return writeObj;
  });

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents:commit?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(idToken),
    body: JSON.stringify({ writes }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore REST commit failed (${res.status}): ${errText}`);
  }
}

export async function restSetDoc(
  docPath: string,
  data: Record<string, unknown>,
  idToken?: string
): Promise<void> {
  await restCommit([{ type: 'set', path: docPath, data }], idToken);
}

export async function restUpdateDoc(
  docPath: string,
  updates: Record<string, unknown>,
  idToken?: string
): Promise<void> {
  await restCommit([{ type: 'update', path: docPath, data: updates }], idToken);
}

export async function restDeleteDoc(
  docPath: string,
  idToken?: string
): Promise<void> {
  const clean = docPath.replace(/^\/+/, '');
  const url = `${BASE_URL}/${clean}?key=${API_KEY}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: buildHeaders(idToken),
    cache: 'no-store',
  });

  if (res.status === 404) {
    return;
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore REST DELETE failed (${res.status}): ${errText}`);
  }
}

export async function restQueryCollection(
  parentDocPath: string,
  collectionId: string,
  options: {
    orderByField?: string;
    direction?: 'ASCENDING' | 'DESCENDING';
    limit?: number;
  } = {},
  idToken?: string
): Promise<Array<{ id: string; [key: string]: any }>> {
  const cleanParent = parentDocPath.replace(/^\/+/, '');
  const url = `${BASE_URL}/${cleanParent}:runQuery?key=${API_KEY}`;

  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId }],
  };

  if (options.orderByField) {
    structuredQuery.orderBy = [
      {
        field: { fieldPath: options.orderByField },
        direction: options.direction || 'DESCENDING',
      },
    ];
  }

  if (options.limit) {
    structuredQuery.limit = options.limit;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(idToken),
    body: JSON.stringify({ structuredQuery }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore REST query failed (${res.status}): ${errText}`);
  }

  const rows = await res.json();
  if (!Array.isArray(rows)) return [];

  const results: Array<{ id: string; [key: string]: any }> = [];
  for (const row of rows) {
    if (!row.document) continue;
    const name: string = row.document.name || '';
    const id = name.split('/').pop() || '';
    const parsed: Record<string, any> = { id };
    if (row.document.fields) {
      for (const [k, v] of Object.entries(row.document.fields)) {
        parsed[k] = fromFirestoreValue(v as Record<string, unknown>);
      }
    }
    results.push(parsed as { id: string; [key: string]: any });
  }

  return results;
}
