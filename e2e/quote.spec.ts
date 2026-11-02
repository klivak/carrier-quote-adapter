import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-05T12:00:00"));
  await page.goto("/");
});

test("Maya answers only what is missing and gets Harbor's exact request", async ({ page }, testInfo) => {
  await expect(page.getByRole("heading", { name: "Your Harbor renters quote" })).toBeVisible();
  await expect(page.getByText("3 answers left")).toBeVisible();
  await expect(page.getByRole("radio", { name: /\$25,000/ })).not.toBeChecked();
  await expect(page.getByRole("radio", { name: /\$50,000/ })).not.toBeChecked();
  await page.screenshot({ path: `test-results/maya-${testInfo.project.name}.png`, fullPage: true });

  await page.getByRole("button", { name: "Confirm and get my quote" }).click();
  await expect(page.getByLabel("Mobile number")).toBeFocused();
  await page.screenshot({ path: `test-results/maya-errors-${testInfo.project.name}.png`, fullPage: true });

  await page.getByLabel("Mobile number").fill("503-555-0100");
  await page.getByLabel("Number of claims in the past 5 years").fill("0");
  await page.getByText("$50,000", { exact: true }).click();
  await page.getByRole("button", { name: "Confirm and get my quote" }).click();

  const request = JSON.parse((await page.getByTestId("final-request").textContent()) ?? "");
  expect(request).toEqual({ applicant_full_name: "Maya Torres", date_of_birth: "03/12/1994", contact_email: "maya@example.com", phone: "503-555-0100", residence_state: "Oregon", postal_code: "97205", contents_coverage: 50000, pets: ["Dog"], dog_breed: "Labrador", claims_last_5_years: 0 });
  await page.screenshot({ path: `test-results/maya-done-${testInfo.project.name}.png`, fullPage: true });
});

test("Sam sees both reasons and no submit button", async ({ page }, testInfo) => {
  await page.getByText("Profile B: Sam Lee").click();
  await expect(page.getByText("Harbor doesn't offer renters insurance in Nevada.")).toBeVisible();
  await expect(page.getByText("You'll be eligible on January 20, 2027.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm and get my quote" })).toHaveCount(0);
  await page.screenshot({ path: `test-results/sam-${testInfo.project.name}.png`, fullPage: true });

  await page.getByRole("button", { name: "Fix my details" }).click();
  await expect(page.getByRole("button", { name: "Confirm and get my quote" })).toHaveCount(0);
  await page.getByLabel("Birth date").fill("01/20/1990");
  await expect(page.getByText("You'll be eligible on")).toHaveCount(0);
  await page.locator("#field-residence_state").getByText("Oregon", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirm and get my quote" })).toBeVisible();
});

test("removing the dog hides the breed and leaves it out of the request", async ({ page }) => {
  await expect(page.getByText('"dog_breed"')).toBeVisible();
  await page.getByRole("checkbox", { name: "Dog" }).uncheck({ force: true });
  await expect(page.getByText('"dog_breed"')).toHaveCount(0);
  await page.getByRole("checkbox", { name: "None" }).check({ force: true });
  await page.getByRole("checkbox", { name: "Dog" }).check({ force: true });
  await expect(page.getByRole("checkbox", { name: "None" })).not.toBeChecked();
  await expect(page.getByText('"dog_breed"')).toBeVisible();
});

test("the form works by keyboard alone", async ({ page, isMobile }) => {
  test.skip(isMobile, "Keyboard run is for desktop");
  await page.getByLabel("Mobile number").focus();
  await page.keyboard.type("5035550100");
  await page.keyboard.press("Tab");
  await page.keyboard.type("1");
  await expect(page.getByLabel("Number of claims in the past 5 years")).toHaveValue("1");
  await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { checked: true }).last()).toBeVisible();
});

test("the layout holds at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
