export interface PublicCursor {
  readonly date: string;
  readonly id: string;
}

export interface EditorCursor {
  readonly updatedAt: string;
  readonly id: string;
}

interface PublicCursorEnvelope extends PublicCursor {
  readonly v: 1;
  readonly type: "public";
}

interface EditorCursorEnvelope extends EditorCursor {
  readonly v: 1;
  readonly type: "editor";
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const UTC_TIMESTAMP_PATTERN =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?Z$/;

export function encodePublicCursor(date: string, id: string): string {
  if (!isCivilDate(date)) {
    throw new TypeError("Public cursor date must be a valid YYYY-MM-DD civil date");
  }

  const normalizedId = normalizeUuid(id);
  if (normalizedId === null) {
    throw new TypeError("Public cursor id must be a valid UUID");
  }

  return encodeEnvelope({
    v: 1,
    type: "public",
    date,
    id: normalizedId,
  });
}

export function decodePublicCursor(cursor: string): PublicCursor | null {
  const envelope = decodeEnvelope(cursor);
  if (
    !hasExactKeys(envelope, ["v", "type", "date", "id"]) ||
    envelope.v !== 1 ||
    envelope.type !== "public" ||
    typeof envelope.date !== "string" ||
    typeof envelope.id !== "string" ||
    !isCivilDate(envelope.date)
  ) {
    return null;
  }

  const id = normalizeUuid(envelope.id);
  return id === null ? null : { date: envelope.date, id };
}

export function encodeEditorCursor(updatedAt: string, id: string): string {
  if (!isUtcTimestamp(updatedAt)) {
    throw new TypeError(
      "Editor cursor updatedAt must be a valid ISO-8601 UTC timestamp ending in Z",
    );
  }

  const normalizedId = normalizeUuid(id);
  if (normalizedId === null) {
    throw new TypeError("Editor cursor id must be a valid UUID");
  }

  return encodeEnvelope({
    v: 1,
    type: "editor",
    updatedAt,
    id: normalizedId,
  });
}

export function decodeEditorCursor(cursor: string): EditorCursor | null {
  const envelope = decodeEnvelope(cursor);
  if (
    !hasExactKeys(envelope, ["v", "type", "updatedAt", "id"]) ||
    envelope.v !== 1 ||
    envelope.type !== "editor" ||
    typeof envelope.updatedAt !== "string" ||
    typeof envelope.id !== "string" ||
    !isUtcTimestamp(envelope.updatedAt)
  ) {
    return null;
  }

  const id = normalizeUuid(envelope.id);
  return id === null ? null : { updatedAt: envelope.updatedAt, id };
}

function encodeEnvelope(
  envelope: PublicCursorEnvelope | EditorCursorEnvelope,
): string {
  return encodeBytes(new TextEncoder().encode(JSON.stringify(envelope)));
}

function decodeEnvelope(cursor: string): Record<string, unknown> | null {
  if (
    typeof cursor !== "string" ||
    !BASE64URL_PATTERN.test(cursor) ||
    cursor.length % 4 === 1
  ) {
    return null;
  }

  try {
    const base64 = cursor.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(
      binary,
      (character) => character.charCodeAt(0),
    );

    if (encodeBytes(bytes) !== cursor) {
      return null;
    }

    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const value: unknown = JSON.parse(decoded);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function encodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function hasExactKeys(
  value: Record<string, unknown> | null,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (value === null) {
    return false;
  }

  const keys = Object.keys(value);
  return keys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeUuid(value: string): string | null {
  return UUID_PATTERN.test(value) ? value.toLowerCase() : null;
}

function isCivilDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day <= daysInMonth[month - 1];
}

function isUtcTimestamp(value: string): boolean {
  const match = UTC_TIMESTAMP_PATTERN.exec(value);
  if (match === null || !isCivilDate(match[1])) {
    return false;
  }

  const hour = Number(match[2]);
  const minute = Number(match[3]);
  const second = Number(match[4]);
  return hour <= 23 && minute <= 59 && second <= 59;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
