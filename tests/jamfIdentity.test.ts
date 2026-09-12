import { describe, expect, it } from "vitest";
import { applyManagedStudentIdentity, loadManagedStudentIdentity } from "../src/game/jamfIdentity";
import type { StudentIdentity } from "../src/game/highscore";

function locationStub(search = "", hash = "") {
  return { search, hash } as Location;
}

describe("Jamf identity adapter", () => {
  it("reads student identity from the URL fragment", () => {
    const identity = loadManagedStudentIdentity(
      locationStub("", "#studentId=jamf-42&studentName=Max%20Mustermann&className=M1")
    );

    expect(identity).toEqual({
      studentId: "jamf-42",
      name: "Max Mustermann",
      className: "M1"
    });
  });

  it("prefers fragment data over query-string fallback", () => {
    const identity = loadManagedStudentIdentity(
      locationStub(
        "?studentId=wrong-id&studentName=Wrong",
        "#studentId=jamf-42&studentName=Max"
      )
    );

    expect(identity?.studentId).toBe("jamf-42");
    expect(identity?.name).toBe("Max");
  });

  it("allows a missing class while still identifying the student", () => {
    const identity = loadManagedStudentIdentity(
      locationStub("", "#studentId=jamf-42&studentName=Max")
    );

    expect(identity?.className).toBeNull();
  });

  it("rejects incomplete managed identity data", () => {
    expect(loadManagedStudentIdentity(locationStub("", "#studentName=Max"))).toBeNull();
    expect(loadManagedStudentIdentity(locationStub("", "#studentId=jamf-42"))).toBeNull();
  });

  it("marks an applied identity as Jamf-managed", () => {
    let saved: StudentIdentity | null = null;

    applyManagedStudentIdentity(
      { studentId: "jamf-42", name: "Max", className: "M1" },
      (identity) => {
        saved = identity;
      }
    );

    expect(saved).toEqual({
      studentId: "jamf-42",
      name: "Max",
      className: "M1",
      source: "jamf"
    });
  });
});
