import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-05T12:00:00"));
  await page.goto("/");
});

const submit = (page: Page) => page.getByRole("button", { name: "Confirm and get my quote" }).click();

async function completeMaya(page: Page) {
  await page.getByLabel("Mobile number").fill("503-555-0100");
  await page.getByLabel("Number of claims in the past 5 years").fill("0");
  await page.getByText("$50,000", { exact: true }).click();
  await submit(page);
}

test("Sam can correct stale details and finish, with the claims lower bound enforced", async ({ page }) => {
  await page.getByText("Profile B: Sam Lee").click();
  await page.getByRole("button", { name: "Fix my details" }).click();
  await page.locator("#field-residence_state").getByText("Oregon", { exact: true }).click();
  await page.getByLabel("Birth date").fill("01/20/1990");
  await page.getByLabel("Mobile number").fill("503-555-0100");
  await page.getByLabel("Number of claims in the past 5 years").fill("0");
  await page.locator("#field-contents_coverage").getByText("$10,000", { exact: true }).click();
  await page.locator("#field-pets").getByText("None", { exact: true }).click();
  await submit(page);
  await expect(page.getByText("so this can't be lower than 1")).toBeVisible();
  await page.getByLabel("Number of claims in the past 5 years").fill("1");
  await submit(page);
  const request = JSON.parse((await page.getByTestId("final-request").textContent()) ?? "");
  expect(request).toMatchObject({ residence_state: "Oregon", date_of_birth: "01/20/1990", claims_last_5_years: 1, pets: ["None"], contents_coverage: 10000 });
  expect(request).not.toHaveProperty("dog_breed");
});

test("while fixing a refusal, the fields to correct come first and stay in place", async ({ page }) => {
  await page.getByText("Profile B: Sam Lee").click();
  await page.getByRole("button", { name: "Fix my details" }).click();
  await expect(page.getByText("Correct the details below to continue.")).toBeVisible();
  await expect(page.locator("section h2").first()).toContainText("From your profile");
  const date = page.getByLabel("Birth date");
  await date.fill("01/20/1990");
  await expect(date).toBeFocused();
  await page.locator("#field-residence_state").getByText("Oregon", { exact: true }).click();
  await expect(page.locator("section h2").first()).toContainText("From your profile");
  await expect(page.getByLabel("Birth date")).toBeVisible();
});

test("three options share one row on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const tops = await page.locator("#field-building_has_sprinklers label").evaluateAll((labels) => labels.map((label) => label.getBoundingClientRect().top));
  expect(new Set(tops).size).toBe(1);
});

test("the date mask adds slashes and a bad date is explained", async ({ page }) => {
  await page.getByRole("button", { name: "Edit Birth date" }).click();
  const date = page.getByLabel("Birth date");
  await date.fill("02301994");
  await expect(date).toHaveValue("02/30/1994");
  await date.blur();
  await expect(page.getByText("Enter a real date as MM/DD/YYYY")).toBeVisible();
});

test("an edit that makes the customer ineligible removes submit", async ({ page }) => {
  await page.getByRole("button", { name: "Edit Birth date" }).click();
  await page.getByLabel("Birth date").fill("01/20/2010");
  await expect(page.getByText("Harbor requires applicants to be at least 21.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm and get my quote" })).toHaveCount(0);
});

test("the sprinkler answer reaches the request, and Not sure removes it", async ({ page }) => {
  const field = page.locator("#field-building_has_sprinklers");
  await field.getByText("No", { exact: true }).click();
  await expect(page.getByText('"building_has_sprinklers": false')).toBeVisible();
  await field.getByText("Not sure", { exact: true }).click();
  await expect(page.getByText('"building_has_sprinklers"')).toHaveCount(0);
});

test("switching profile resets the answers", async ({ page }) => {
  await page.getByLabel("Mobile number").fill("503-555-0100");
  await page.getByText("Profile B: Sam Lee").click();
  await page.getByText("Profile A: Maya Torres").click();
  await expect(page.getByLabel("Mobile number")).toHaveValue("");
});

test("Change my answers returns to the form with answers kept", async ({ page }) => {
  await completeMaya(page);
  await page.getByRole("button", { name: "Change my answers" }).click();
  await expect(page.getByLabel("Mobile number")).toHaveValue("503-555-0100");
});

test("a failed clipboard write shows a message", async ({ page }) => {
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) } }));
  await completeMaya(page);
  await page.getByRole("button", { name: "Copy JSON" }).click();
  await expect(page.getByText("Couldn't copy.")).toBeVisible();
});

test("no sideways scrolling at a width equal to 200% zoom on a small laptop", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("reduced motion turns off transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const transition = await page.locator("#field-pets label").first().evaluate((element) => getComputedStyle(element).transitionProperty);
  expect(transition).toBe("none");
});

test("keyboard focus is visible on a choice card", async ({ page, isMobile }) => {
  test.skip(isMobile, "Keyboard run is for desktop");
  await page.locator("#field-building_has_sprinklers input").first().focus();
  await page.keyboard.press("ArrowRight");
  const shadow = await page.locator("#field-building_has_sprinklers label").nth(1).evaluate((element) => getComputedStyle(element).boxShadow);
  expect(shadow).not.toBe("none");
});
