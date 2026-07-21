import { test, expect } from '@playwright/test';
import path from 'path';

test('End-to-End Sales Cycle', async ({ browser }) => {
  test.setTimeout(240000); // 4 minutes

  const farmerContext = await browser.newContext();
  const buyerContext = await browser.newContext();
  const agentContext = await browser.newContext();
  const adminContext = await browser.newContext();

  const farmerPage = await farmerContext.newPage();
  const buyerPage = await buyerContext.newPage();
  const agentPage = await agentContext.newPage();
  const adminPage = await adminContext.newPage();

  const APP_URL = 'http://localhost:3000';
  const PASSWORD = '1234567890';

  console.log("1. Logging in Farmer, Buyer, Agent and Admin...");
  
  // Login Farmer
  await farmerPage.goto(`${APP_URL}/login`);
  await farmerPage.fill('input[type="email"]', 'timileyinolayuwa@gmail.com');
  await farmerPage.fill('input[type="password"]', PASSWORD);
  await farmerPage.click('button[type="submit"]');
  await farmerPage.waitForURL('**/farmer/dashboard', { timeout: 30000 });
  console.log("Farmer logged in");

  // Login Buyer
  await buyerPage.goto(`${APP_URL}/login`);
  await buyerPage.fill('input[type="email"]', 'ebentim4@gmail.com');
  await buyerPage.fill('input[type="password"]', PASSWORD);
  await buyerPage.click('button[type="submit"]');
  await buyerPage.waitForURL('**/buyer/dashboard', { timeout: 30000 });
  console.log("Buyer logged in");

  // Login Agent
  await agentPage.goto(`${APP_URL}/login`);
  await agentPage.fill('input[type="email"]', 'banjodavid001@gmail.com');
  await agentPage.fill('input[type="password"]', PASSWORD);
  await agentPage.click('button[type="submit"]');
  await agentPage.waitForURL('**/agent/dashboard', { timeout: 30000 });
  console.log("Agent logged in");
  
  // Login Admin
  await adminPage.goto(`${APP_URL}/login`);
  await adminPage.fill('input[type="email"]', 'admin@alpinesbolt.com');
  await adminPage.fill('input[type="password"]', PASSWORD);
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL('**/admin/dashboard', { timeout: 30000 });
  console.log("Admin logged in");

  console.log("2. Farmer creating a product...");
  await farmerPage.goto(`${APP_URL}/farmer/products`);
  await farmerPage.click('button:has-text("Add Product")');
  const uniqueProductName = `Playwright Tomato ${Date.now()}`;
  await farmerPage.fill('input[id="name"]', uniqueProductName);
  await farmerPage.fill('input[id="crop_type"]', 'Vegetable');
  await farmerPage.fill('input[id="quantity"]', '100');
  await farmerPage.fill('input[id="unit"]', 'kg');
  await farmerPage.fill('input[id="price"]', '500');
  await farmerPage.fill('input[id="harvest_date"]', '2026-08-01');
  await farmerPage.fill('input[id="location"]', 'Test Farm');
  
  // Upload image
  await farmerPage.setInputFiles('input[type="file"]', path.resolve(__dirname, 'dummy.png'));
  
  await farmerPage.click('button:has-text("Create Product")');
  await expect(farmerPage.locator(`text=${uniqueProductName}`)).toBeVisible({ timeout: 10000 });
  console.log("Product created");
  
  console.log("3. Admin approving the product...");
  await adminPage.goto(`${APP_URL}/admin/products`);
  await adminPage.waitForSelector(`h3:has-text("${uniqueProductName}")`, { timeout: 15000 });
  
  // Find the approve button associated with the product card
  const productCard = adminPage.locator(`.bg-card:has(h3:has-text("${uniqueProductName}"))`).first();
  await productCard.locator('button:has-text("Approve")').click();
  // Wait for it to disappear from the pending list
  await expect(adminPage.locator(`h3:has-text("${uniqueProductName}")`)).toBeHidden({ timeout: 10000 });
  console.log("Product approved by Admin");

  console.log("4. Buyer finding and ordering the product...");
  await buyerPage.goto(`${APP_URL}/products`);
  // Try reloading if not found immediately (Next.js cache might be stale)
  let found = false;
  for (let i = 0; i < 5; i++) {
    try {
      await buyerPage.waitForSelector(`text=${uniqueProductName}`, { timeout: 3000 });
      found = true;
      break;
    } catch (e) {
      console.log(`Product not found, reloading... (attempt ${i + 1})`);
      await buyerPage.reload();
    }
  }

  if (!found) {
    await buyerPage.screenshot({ path: 'tests/screenshot_buyer_products.png' });
    throw new Error('Product not found after multiple reloads');
  }
  
  console.log("Clicking View Details...");
  const buyerProductCard = buyerPage.locator('.bg-card', { hasText: uniqueProductName }).first();
  await buyerProductCard.locator('text="View Details"').click();
  
  console.log("Waiting for product detail page to load...");
  await buyerPage.waitForURL(/\/products\/.*/, { timeout: 15000 }).catch(async (e) => {
    await buyerPage.screenshot({ path: 'tests/screenshot_buyer_nav_failed.png' });
    throw e;
  });
  
  console.log("Waiting for Place Order button...");
  await buyerPage.waitForSelector('button:has-text("Place Order")', { timeout: 15000 }).catch(async (e) => {
    await buyerPage.screenshot({ path: 'tests/screenshot_buyer_no_place_order.png' });
    throw e;
  });
  await buyerPage.click('button:has-text("Place Order")');
  await buyerPage.fill('input[type="number"]', '10');
  await buyerPage.click('button:has-text("Confirm Order")');
  
  console.log("Waiting for navigation to orders page...");
  await buyerPage.waitForURL(/\/buyer\/orders/, { timeout: 15000 });
  await expect(buyerPage.locator(`text=${uniqueProductName}`)).toBeVisible({ timeout: 10000 });
  console.log("Order placed");

  console.log("5. Farmer accepting the order...");
  await farmerPage.goto(`${APP_URL}/farmer/orders`);
  
  await farmerPage.waitForSelector('button:has-text("Accept")');
  await farmerPage.click('button:has-text("Accept")');
  await farmerPage.click('button:has-text("OK")', { timeout: 3000 }).catch(() => {});
  console.log("Order accepted");

  console.log("6. Buyer paying for the order...");
  await buyerPage.reload();
  await buyerPage.waitForSelector('button:has-text("Pay securely with Escrow")');
  await buyerPage.click('button:has-text("Pay securely with Escrow")');
  
  await buyerPage.waitForURL(/\/buyer\/orders\/.*\/tracking/, { timeout: 15000 });
  console.log("Order paid and redirected to tracking");

  console.log("7. Agent picking up and verifying the order...");
  await agentPage.reload(); 
  
  // Wait a bit to ensure the order assigns completely
  await agentPage.waitForTimeout(2000);
  
  // Now all orders must be claimed manually
  const claimBtn = agentPage.locator('button:has-text("Claim Delivery")').first();
  await claimBtn.waitFor();
  await claimBtn.click();
  await agentPage.locator('button:has-text("OK")').first().click({ timeout: 15000 });
  
  const pickupBtn = agentPage.locator('button:has-text("Mark as Picked Up")').first();
  await pickupBtn.waitFor();
  await pickupBtn.click();
  
  const verifyBtn = agentPage.locator('button:has-text("Verify Delivery")').first();
  await verifyBtn.waitFor({ state: 'visible', timeout: 15000 });
  console.log("Order picked up");
  
  console.log("8. Extracting OTP from Buyer's view...");
  const otpElement = buyerPage.locator('p.text-4xl.font-bold');
  await otpElement.waitFor({ state: 'visible', timeout: 30000 });
  const otpText = await otpElement.innerText();
  const otpMatch = otpText.match(/\d{6}/);
  if (!otpMatch) throw new Error("OTP not found on buyer page");
  const otpCode = otpMatch[0];
  console.log(`Extracted OTP: ${otpCode}`);
  
  console.log("9. Agent entering OTP...");
  await agentPage.locator('input[placeholder="Enter 6-digit code"]').first().fill(otpCode);
  await agentPage.locator('button:has-text("Verify Delivery")').first().click();
  await agentPage.locator('button:has-text("OK")').first().click({ timeout: 15000 });
  
  console.log("=== End to End Flow Completed Successfully! ===");
});
