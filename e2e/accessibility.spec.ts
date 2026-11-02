import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const noViolations = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.html}`)).toEqual([]);
};

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-05T12:00:00"));
  await page.goto("/");
});

const submit = (page: Page) => page.getByRole("button", { name: "Confirm and get my quote" }).click();

test("the form has no violations", async ({ page }) => {
  await noViolations(page);
});

test("the error state has no violations and links errors to fields", async ({ page }) => {
  await submit(page);
  await noViolations(page);
  const phone = page.getByLabel("Mobile number");
  await expect(phone).toHaveAttribute("aria-invalid", "true");
  await expect(phone).toHaveAccessibleDescription("Enter your mobile number");
});

test("the refusal has no violations, and Fix moves focus to a field", async ({ page }) => {
  await page.getByText("Profile B: Sam Lee").click();
  await noViolations(page);
  await page.getByRole("button", { name: "Fix my details" }).click();
  await expect(page.locator("#field-residence_state input").first()).toBeFocused();
  await noViolations(page);
});

test("the success screen has no violations and receives focus", async ({ page }) => {
  await page.getByLabel("Mobile number").fill("503-555-0100");
  await page.getByLabel("Number of claims in the past 5 years").fill("0");
  await page.getByText("$50,000", { exact: true }).click();
  await submit(page);
  await expect(page.getByRole("heading", { name: "Your request is ready" })).toBeFocused();
  await noViolations(page);
});

test("a blur only reports an error when leaving the whole group", async ({ page, isMobile }) => {
  test.skip(isMobile, "Keyboard run is for desktop");
  await page.getByLabel("Mobile number").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByText("Enter your mobile number")).toBeVisible();
  await page.locator("#field-contents_coverage input").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#field-contents_coverage").getByText("Choose an option")).toHaveCount(0);
});

test("editing a profile value updates the request", async ({ page }) => {
  await page.getByRole("button", { name: "Edit Postal code" }).click();
  await expect(page.getByLabel("Postal code")).toBeFocused();
  await page.getByLabel("Postal code").fill("97205-1234");
  await expect(page.getByText('"postal_code": "97205-1234"')).toBeVisible();
});
