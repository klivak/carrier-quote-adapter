import { describe, expect, it } from "vitest";
import { ageOn, carrierDateToIso, formatLongDate, isoToCarrierDate, joinList, nearestOptions, nextEligibleDate, stateName } from "./converters";

describe("dates", () => {
  it("reformats by string, with no timezone shift", () => {
    expect(isoToCarrierDate("1994-03-12")).toBe("03/12/1994");
    expect(isoToCarrierDate("2000-01-01")).toBe("01/01/2000");
  });
  it("rejects dates that do not exist", () => {
    expect(isoToCarrierDate("1994-02-30")).toBeNull();
    expect(isoToCarrierDate("not a date")).toBeNull();
    expect(carrierDateToIso("13/01/2000")).toBeNull();
    expect(carrierDateToIso("02/29/2001")).toBeNull();
  });
  it("reads the carrier format back", () => {
    expect(carrierDateToIso("02/29/2004")).toBe("2004-02-29");
  });
  it("formats a long date", () => {
    expect(formatLongDate("2027-01-20")).toBe("January 20, 2027");
  });
});

describe("age", () => {
  it("changes exactly on the birthday", () => {
    expect(ageOn("2006-01-20", "2027-01-19")).toBe(20);
    expect(ageOn("2006-01-20", "2027-01-20")).toBe(21);
    expect(ageOn("2006-01-20", "2027-01-21")).toBe(21);
  });
  it("counts a leap-day birthday as March 1 in other years", () => {
    expect(ageOn("2004-02-29", "2025-02-28")).toBe(20);
    expect(ageOn("2004-02-29", "2025-03-01")).toBe(21);
    expect(ageOn("2004-02-29", "2024-02-29")).toBe(20);
  });
  it("finds the first eligible date", () => {
    expect(nextEligibleDate("2006-01-20", 21)).toBe("2027-01-20");
    expect(nextEligibleDate("2004-02-29", 21)).toBe("2025-03-01");
  });
});

describe("states", () => {
  it("converts codes, including states a carrier does not cover", () => {
    expect(stateName("OR")).toBe("Oregon");
    expect(stateName("NV")).toBe("Nevada");
    expect(stateName("ZZ")).toBeNull();
  });
});

describe("nearestOptions", () => {
  const options = [10000, 25000, 50000, 75000];
  it("returns one below and one above", () => {
    expect(nearestOptions(32000, options)).toEqual([25000, 50000]);
    expect(nearestOptions(12000, options)).toEqual([10000, 25000]);
  });
  it("returns one option at the extremes", () => {
    expect(nearestOptions(90000, options)).toEqual([75000]);
    expect(nearestOptions(5000, options)).toEqual([10000]);
  });
});

describe("joinList", () => {
  it("reads naturally", () => {
    expect(joinList(["A", "B", "C"])).toBe("A, B and C");
    expect(joinList(["A"])).toBe("A");
  });
});
