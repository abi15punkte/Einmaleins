import type { StudentIdentity } from "./highscore";

export interface ManagedStudentIdentity {
  studentId: string;
  name: string;
  className: string | null;
}

const PARAMETER_ALIASES = {
  studentId: ["studentId", "jamfStudentId", "userId", "UserId", "jamfUserId"],
  firstName: ["firstName", "FirstName", "vorname", "jamfFirstName"],
  lastName: ["lastName", "LastName", "nachname", "jamfLastName"],
  fullName: ["fullName", "FullName", "studentFullName", "jamfFullName"],
  legacyName: ["studentName", "name", "jamfStudentName"],
  groups: ["userGroups", "UserGroups", "usergroups", "groups", "jamfGroups"],
  directClass: ["className", "class", "jamfClass"]
} as const;

const VALID_CLASS_GROUP = /^(?:M(?:[1-9]|1[0-6])|Lehrer)$/i;

export function loadManagedStudentIdentity(locationObject: Location | null = getLocation()): ManagedStudentIdentity | null {
  if (!locationObject) return null;

  const sources = [
    new URLSearchParams(locationObject.hash.replace(/^#\??/, "")),
    new URLSearchParams(locationObject.search)
  ];

  const studentId = findFirst(sources, PARAMETER_ALIASES.studentId);
  const firstName = findFirst(sources, PARAMETER_ALIASES.firstName);
  const lastName = findFirst(sources, PARAMETER_ALIASES.lastName);
  const fullName = findFirst(sources, PARAMETER_ALIASES.fullName);
  const legacyName = findFirst(sources, PARAMETER_ALIASES.legacyName);
  const className = findManagedClassName(sources);
  const name = buildManagedName(firstName, lastName, fullName, legacyName);

  // A valid Jamf School owner plus a readable name is enough to identify the player.
  // The class group is optional so other Jamf School groups (for example Förderkinder)
  // do not incorrectly force the manual profile fallback.
  if (!studentId || !name) return null;

  return {
    studentId,
    name,
    className
  };
}

export function applyManagedStudentIdentity(
  managedIdentity: ManagedStudentIdentity,
  save: (identity: StudentIdentity) => void
): void {
  save({
    studentId: managedIdentity.studentId,
    name: managedIdentity.name,
    className: managedIdentity.className,
    source: "jamf"
  });
}

function buildManagedName(
  firstName: string | null,
  lastName: string | null,
  fullName: string | null,
  legacyName: string | null
): string | null {
  if (firstName && lastName) return `${firstName} ${lastName}`.trim();
  if (fullName) return fullName;
  if (legacyName) return legacyName;
  if (firstName) return firstName;
  return null;
}

function findManagedClassName(sources: URLSearchParams[]): string | null {
  const groupValue = findFirst(sources, PARAMETER_ALIASES.groups);
  const directClass = findFirst(sources, PARAMETER_ALIASES.directClass);
  return findValidClassGroup(groupValue) ?? findValidClassGroup(directClass);
}

function findValidClassGroup(value: string | null): string | null {
  if (!value) return null;

  const candidates = value
    .replace(/[\[\]{}\"]/g, "")
    .split(/[\n,;|]/)
    .map((candidate) => candidate.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    if (VALID_CLASS_GROUP.test(candidate)) {
      return normalizeClassGroup(candidate);
    }
  }

  return null;
}

function normalizeClassGroup(value: string): string {
  const normalized = value.trim();
  if (/^lehrer$/i.test(normalized)) return "Lehrer";
  return normalized.toUpperCase();
}

function findFirst(sources: URLSearchParams[], aliases: readonly string[]): string | null {
  for (const source of sources) {
    for (const alias of aliases) {
      const value = source.get(alias)?.trim();
      if (value) return value;
    }
  }
  return null;
}

function getLocation(): Location | null {
  return typeof window !== "undefined" ? window.location : null;
}
