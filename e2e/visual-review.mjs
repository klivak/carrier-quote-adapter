// Manual review helper: start the app on port 3417, then run "node e2e/visual-review.mjs" and look at the images in tmp/shots.
import { chromium } from "@playwright/test";

const SIZES = { phone: { width: 390, height: 844 }, tablet: { width: 820, height: 1100 }, desktop: { width: 1440, height: 900 } };
const browser = await chromium.launch();

for (const [name, viewport] of Object.entries(SIZES)) {
  const page = await browser.newPage({ viewport });
  const shot = (state) => page.screenshot({ path: `tmp/shots/${name}-${state}.png`, fullPage: true });
  const submit = () => page.getByRole("button", { name: "Confirm and get my quote" }).click();

  await page.goto("http://localhost:3417");
  await shot("form");
  await submit();
  await shot("errors");
  await page.getByLabel("Mobile number").fill("503-555-0100");
  await page.getByLabel("Number of claims in the past 5 years").fill("0");
  await page.getByText("$50,000", { exact: true }).click();
  await page.getByRole("button", { name: "Edit Postal code" }).click();
  await shot("filled");
  await submit();
  await shot("success");

  await page.goto("http://localhost:3417");
  await page.getByText("Profile B: Sam Lee").click();
  await shot("refused");
  await page.getByRole("button", { name: "Fix my details" }).click();
  await shot("fixing");
  await page.close();
}

await browser.close();
