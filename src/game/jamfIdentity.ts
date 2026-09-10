import type { StudentIdentity } from "./highscore";

export interface ManagedStudentIdentity {
  studentId: string;
  name: string;
  className: string | null;
}

const PARAMETER_ALIASES = {
  studentId: ["studentId", "jamfStudentId"],
  name: ["studentName", "name", "jamfStudentName"],
  className: ["className", "class", "jamfClass"]
} as const;

export function loadManagedStudentIdentity(locationObject: Location | null = getLocation()): ManagedStudentIdentity | null {
  if (!locationObject) return null;

  const sources = [
    new URLSearchParams(locationObject.hash.replace(/^#\??/, "")),
    new URLSearchParams(locationObject.search)
  ];

  const studentId = findFirst(sources, PARAMETER_ALIASES.studentId);
  const name = findFirst(sources, PARAMETER_ALIASES.name);
  const className = findFirst(sources, PARAMETER_ALIASES.className);

  if (!studentId || !name) return null;

  return { studentId, name, className: className || null };
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
