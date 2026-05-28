import type { JarvisSettings } from './storage';

export type ApiConfig = {
  backendUrl: string;
  apiToken: string;
  deviceId: string;
};

export type HistoryItem = {
  id: number;
  title: string;
  detail: string;
  isError?: boolean;
};

export type PendingPhoneCommand = {
  action?: string | null;
  target?: string | null;
};

export type NoteSummary = {
  id: string;
  title: string;
  createdAt: string;
};

export type NoteDetail = NoteSummary & {
  content: string;
};

export type ProcessTextResult = {
  response: string;
  status?: string;
  missing?: string;
  draft?: {
    content?: string;
  };
};

type AppAction = 'otwórz' | 'zamknij';

function trimSlash(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function assertConfig(config: ApiConfig) {
  const baseUrl = trimSlash(config.backendUrl);
  const token = config.apiToken.trim();

  if (!baseUrl) {
    throw new Error('Podaj Backend URL.');
  }

  return { baseUrl, token };
}

function assertAuthedConfig(config: ApiConfig) {
  const resolved = assertConfig(config);

  if (!resolved.token) {
    throw new Error('Podaj Backend URL i API Token.');
  }

  return resolved;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringField(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
}

function readJsonValue(value: unknown) {
  const text = readStringField(value);

  return text || null;
}

async function readTextOrJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function parseApiResponse(response: Response, path = '') {
  const payload = await readTextOrJson(response);

  let message = 'OK';

  if (isRecord(payload)) {
    const responseValue = readJsonValue(payload.response);
    const detailValue = readJsonValue(payload.detail);
    const statusValue = readStringField(payload.status).toLowerCase();

    if (responseValue) {
      message = responseValue;
    } else if (detailValue) {
      message = detailValue;
    }

    if (statusValue === 'error') {
      throw new Error(message || 'Błąd backendu');
    }
  } else if (payload !== null) {
    message = readStringField(payload) || 'OK';
  }

  if (path.startsWith('/notes') && response.status === 404) {
    throw new Error('Notatki nie są dostępne w tym Hubie.');
  }

  if (!response.ok) {
    throw new Error(message || `Błąd backendu: ${response.status}`);
  }

  return message;
}

async function fetchBackend(config: ApiConfig, path: string, options?: RequestInit) {
  const { baseUrl } = assertConfig(config);

  try {
    return await fetch(`${baseUrl}${path}`, options);
  } catch {
    throw new Error('Nie można połączyć się z backendem.');
  }
}

async function requestMessage(config: ApiConfig, path: string, options?: RequestInit) {
  const response = await fetchBackend(config, path, options);

  if (response.status === 401 || response.status === 403) {
    throw new Error('Unauthorized');
  }

  return parseApiResponse(response, path);
}

async function requestJson(config: ApiConfig, path: string, options?: RequestInit) {
  const { baseUrl, token } = assertAuthedConfig(config);
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options?.headers ?? {}),
        'X-Jarvis-Token': token,
      },
    });
  } catch {
    throw new Error('Brak połączenia z backendem');
  }

  const payload = await readTextOrJson(response);

  if (response.status === 401 || response.status === 403) {
    throw new Error('Unauthorized');
  }

  if (path.startsWith('/notes') && response.status === 404) {
    throw new Error('Notatki nie są dostępne w tym Hubie.');
  }

  if (!response.ok) {
    const detail = isRecord(payload) ? readStringField(payload.detail) : readStringField(payload);
    throw new Error(detail || `Błąd backendu: ${response.status}`);
  }

  return payload;
}

function formatNoteDate(value: unknown) {
  const rawValue = readStringField(value);

  if (!rawValue) {
    return 'Brak daty';
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return rawValue;
  }

  return date.toLocaleString();
}

function getNoteCreatedAt(note: Record<string, unknown>) {
  return note.created_at ?? note.createdAt ?? note.created ?? note.timestamp ?? '';
}

function normalizeNoteSummary(value: unknown, index = 0): NoteSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = readStringField(value.title ?? value.name ?? value.subject) || 'Bez tytułu';
  const createdAt = formatNoteDate(getNoteCreatedAt(value));
  const id =
    readStringField(
      value.id ?? value.note_id ?? value.uuid ?? value.key ?? value.filename ?? value.file ?? value.path
    ) || `${title}-${createdAt}-${index}`;
  value.title = title;
  value.createdAt = createdAt;

  if (!id) {
    return null;
  }

  return {
    id,
    title: readStringField(value.title) || 'Bez tytułu',
    createdAt: formatNoteDate(getNoteCreatedAt(value)),
  };
}

function normalizeNoteDetail(value: unknown): NoteDetail | null {
  if (isRecord(value) && isRecord(value.note)) {
    return normalizeNoteDetail(value.note);
  }

  if (!isRecord(value)) {
    return null;
  }

  const summary = normalizeNoteSummary(value);

  if (!summary) {
    return null;
  }

  return {
    ...summary,
    content: readStringField(value.content ?? value.body ?? value.text) || 'Brak treści.',
  };
}

function getNotesArray(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (isRecord(payload) && Array.isArray(payload.notes)) {
    return payload.notes;
  }

  if (isRecord(payload) && Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
}

export async function getStatus(config: ApiConfig) {
  return requestMessage(config, '/status');
}

export async function sendChat(config: ApiConfig, message: string) {
  return requestMessage(config, '/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Jarvis-Token': config.apiToken,
    },
    body: JSON.stringify({ message }),
  });
}

export async function sendCommand(config: ApiConfig, command: string) {
  return requestMessage(config, '/command', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Jarvis-Token': config.apiToken,
    },
    body: JSON.stringify({ command }),
  });
}

export async function sendProcessText(config: ApiConfig, text: string) {
  return requestMessage(config, '/process-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Jarvis-Token': config.apiToken,
    },
    body: JSON.stringify({
      text,
      device_id: config.deviceId.trim() || 'hubert-pc',
    }),
  });
}

export async function sendProcessTextDetailed(
  config: ApiConfig,
  text: string
): Promise<ProcessTextResult> {
  const response = await fetchBackend(config, '/process-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Jarvis-Token': config.apiToken,
    },
    body: JSON.stringify({
      text,
      device_id: config.deviceId.trim() || 'hubert-pc',
    }),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('Unauthorized');
  }

  const payload = await readTextOrJson(response);

  if (!response.ok) {
    const detail = isRecord(payload)
      ? readStringField(payload.detail ?? payload.response)
      : readStringField(payload);
    throw new Error(detail || `Błąd backendu: ${response.status}`);
  }

  if (!isRecord(payload)) {
    return {
      response: readStringField(payload) || 'OK',
    };
  }

  const draft = isRecord(payload.draft) ? payload.draft : null;

  return {
    response: readStringField(payload.response ?? payload.detail ?? payload.message) || 'OK',
    status: readStringField(payload.status),
    missing: readStringField(payload.missing),
    draft: draft
      ? {
          content: readStringField(draft.content ?? draft.text ?? draft.body),
        }
      : undefined,
  };
}

export async function getApps(config: ApiConfig) {
  return requestJson(config, '/apps');
}

export async function getAgents(config: ApiConfig) {
  return requestJson(config, '/agents');
}

export async function toggleApp(config: ApiConfig, target: string, action: AppAction) {
  return sendProcessText(config, `${action} ${target}`);
}

export async function getNotes(config: ApiConfig) {
  const payload = await requestJson(config, '/notes');

  return getNotesArray(payload)
    .map(normalizeNoteSummary)
    .filter((note): note is NoteSummary => note !== null);
}

export async function getNote(config: ApiConfig, noteId: string) {
  const payload = await requestJson(config, `/notes/${encodeURIComponent(noteId)}`);
  const detail = normalizeNoteDetail(payload);

  if (!detail) {
    throw new Error('Nie udało się odczytać notatki.');
  }

  return detail;
}

export async function createNote(config: ApiConfig, note: { title: string; content: string }) {
  return requestJson(config, '/notes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(note),
  });
}

export async function deleteNote(config: ApiConfig, noteId: string) {
  return requestJson(config, `/notes/${encodeURIComponent(noteId)}`, {
    method: 'DELETE',
  });
}

export async function getSettings(config: ApiConfig) {
  return requestJson(config, '/settings');
}

export async function saveSettings(config: ApiConfig, settings: JarvisSettings) {
  return requestJson(config, '/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });
}

export async function getPhonePending(config: ApiConfig) {
  const { baseUrl, token } = assertAuthedConfig(config);

  try {
    const response = await fetch(`${baseUrl}/phone/pending`, {
      method: 'GET',
      headers: {
        'X-Jarvis-Token': token,
      },
    });

    if (!response.ok || response.status === 204) {
      return { active: true, command: null };
    }

    const payload = await readTextOrJson(response);

    if (!isRecord(payload)) {
      return { active: true, command: null };
    }

    return {
      active: true,
      command: {
        action: typeof payload.action === 'string' ? payload.action : null,
        target: typeof payload.target === 'string' ? payload.target : null,
      } satisfies PendingPhoneCommand,
    };
  } catch {
    return { active: false, command: null };
  }
}
