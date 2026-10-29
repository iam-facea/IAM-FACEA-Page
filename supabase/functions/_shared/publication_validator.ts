export type PublicationStatus = "draft" | "published";

export interface PublicationCreateData {
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly status: PublicationStatus;
  readonly publicationDate?: string;
  readonly imageContentId: string;
}

export interface PublicationReplaceData {
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly status: PublicationStatus;
  readonly publicationDate: string;
  readonly imageContentId: string;
}

export class ValidationError extends Error {
  readonly status = 400;

  constructor(
    message: string,
    readonly field: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export { ValidationError as PublicationValidationError };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CREATE_FIELDS = [
  "title",
  "description",
  "category",
  "status",
  "publicationDate",
  "imageContentId",
] as const;
const REPLACE_FIELDS = CREATE_FIELDS;

export function validateLimit(
  rawLimit: string | null | undefined,
): number {
  if (rawLimit === null || rawLimit === undefined) {
    return 20;
  }
  if (!/^[1-9]\d*$/.test(rawLimit)) {
    throw invalid("limit", "Limit must be an integer between 1 and 50");
  }

  const limit = Number(rawLimit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    throw invalid("limit", "Limit must be an integer between 1 and 50");
  }

  return limit;
}

export function validateUuid(
  rawUuid: string | null | undefined,
  field = "id",
): string {
  if (typeof rawUuid !== "string" || !UUID_PATTERN.test(rawUuid)) {
    throw invalid(field, `${field} must be a valid UUID`);
  }

  return rawUuid.toLowerCase();
}

export function validateId(
  rawId: string | null | undefined,
): string {
  return validateUuid(rawId, "id");
}

export function validatePublicationCreate(
  payload: unknown,
): PublicationCreateData {
  const input = validatePayload(payload, CREATE_FIELDS);
  const result: PublicationCreateData = {
    title: validateText(input.title, "title", 160),
    description: validateText(input.description, "description", 1000),
    category: validateText(input.category, "category", 80),
    status: Object.hasOwn(input, "status")
      ? validateStatus(input.status)
      : "draft",
    imageContentId: validateUuid(input.imageContentId as
      | string
      | null
      | undefined, "imageContentId"),
  };

  if (Object.hasOwn(input, "publicationDate")) {
    return {
      ...result,
      publicationDate: validatePublicationDate(input.publicationDate),
    };
  }

  return result;
}

export function validatePublicationReplace(
  payload: unknown,
): PublicationReplaceData {
  const input = validatePayload(payload, REPLACE_FIELDS);
  requireFields(input, REPLACE_FIELDS);

  return {
    title: validateText(input.title, "title", 160),
    description: validateText(input.description, "description", 1000),
    category: validateText(input.category, "category", 80),
    status: validateStatus(input.status),
    publicationDate: validatePublicationDate(input.publicationDate),
    imageContentId: validateUuid(input.imageContentId as
      | string
      | null
      | undefined, "imageContentId"),
  };
}

function validatePayload(
  payload: unknown,
  allowedFields: readonly string[],
): Record<string, unknown> {
  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    throw invalid("payload", "Payload must be a JSON object");
  }

  const input = payload as Record<string, unknown>;
  const unknownField = Object.keys(input).find((field) =>
    !allowedFields.includes(field)
  );
  if (unknownField !== undefined) {
    throw invalid("payload", `Payload contains unknown field: ${unknownField}`);
  }

  return input;
}

function requireFields(
  input: Record<string, unknown>,
  requiredFields: readonly string[],
): void {
  for (const field of requiredFields) {
    if (!Object.hasOwn(input, field)) {
      throw invalid(field, `${field} is required`);
    }
  }
}

function validateText(
  value: unknown,
  field: string,
  maximumLength: number,
): string {
  if (typeof value !== "string") {
    throw invalid(field, `${field} must be a string`);
  }

  const trimmed = value.trim();
  const length = Array.from(trimmed).length;
  if (length < 1 || length > maximumLength) {
    throw invalid(
      field,
      `${field} must contain between 1 and ${maximumLength} characters`,
    );
  }

  return trimmed;
}

function validateStatus(value: unknown): PublicationStatus {
  if (value !== "draft" && value !== "published") {
    throw invalid("status", "status must be draft or published");
  }
  return value;
}

function validatePublicationDate(value: unknown): string {
  if (typeof value !== "string" || !isCivilDate(value)) {
    throw invalid(
      "publicationDate",
      "publicationDate must be a valid YYYY-MM-DD civil date",
    );
  }
  return value;
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

  const leapYear = year % 4 === 0 &&
    (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
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

function invalid(field: string, message: string): ValidationError {
  return new ValidationError(message, field);
}
