import { describe, expect, it } from "vitest";
import type { FieldDefinition } from "@/lib/types";
import { formatOption, formatValue, maskDate } from "./display";

const usd: FieldDefinition = { key: "amount", label: "Amount (USD)", type: "select", required: true };
const plain: FieldDefinition = { key: "count", label: "Count", type: "number", required: true };

describe("maskDate", () => {
  it.each([
    ["", ""],
    ["03", "03"],
    ["031", "03/1"],
    ["03121994", "03/12/1994"],
    ["03/12/1994", "03/12/1994"],
    ["031219941234", "03/12/1994"],
    ["ab03", "03"],
  ])("%s becomes %s", (input, output) => {
    expect(maskDate(input)).toBe(output);
  });
});

describe("display", () => {
  it("formats money only for USD fields", () => {
    expect(formatOption(usd, 50000)).toBe("$50,000");
    expect(formatOption(plain, 50000)).toBe("50000");
  });
  it("formats each value type", () => {
    expect(formatValue(plain, ["Dog", "Cat"])).toBe("Dog, Cat");
    expect(formatValue(plain, true)).toBe("Yes");
    expect(formatValue(plain, false)).toBe("No");
    expect(formatValue(plain, undefined)).toBe("");
  });
});
