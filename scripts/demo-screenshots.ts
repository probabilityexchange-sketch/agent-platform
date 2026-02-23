import { chromium } from "@playwright/test";

const BASE_URL = process.env.DEMO_URL || "https://randi.chat";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "./demo-screenshots";

const screenshots = [
    { name: "01-home", path: "/", waitFor: 2000 },
    { name: "02-demo", path: "/demo", waitFor: 3000 },
    { name: "03-dashboard", path: "/dashboard", waitFor: 2000 },
    { name: "04-agents", path: "/agents", waitFor: 2000 },
    { name: "05-chat", path: "/chat", waitFor: 2000 },
    { name: "06-containers", path: "/containers", waitFor: 2000 },
    { name: "07-fleet", path: "/fleet", waitFor: 2000 },
    { name: "08-credits", path: "/credits", waitFor: 2000 },
    { name: "09-transparency", path: "/transparency", waitFor: 2000 },
    { name: "10-roadmap", path: "/roadmap", waitFor: 2000 },
    { name: "11-integrations", path: "/integrations", waitFor: 2000 },
];

async function captureScreenshots() {
    console.log(`🚀 Starting screenshot capture for ${BASE_URL}`);

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox']
    });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();

    // Create output directory
    const fs = await import('fs');
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    for (const screenshot of screenshots) {
        const url = `${BASE_URL}${screenshot.path}`;
        console.log(`📸 Capturing: ${screenshot.name} (${url})`);

        try {
            await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
            await page.waitForTimeout(screenshot.waitFor);

            const filename = `${OUTPUT_DIR}/${screenshot.name}.png`;
            await page.screenshot({
                path: filename,
                fullPage: false
            });
            console.log(`   ✅ Saved: ${filename}`);
        } catch (error) {
            console.error(`   ❌ Failed: ${error}`);
        }
    }

    await browser.close();
    console.log("✨ Done! Screenshots saved to", OUTPUT_DIR);
}

captureScreenshots().catch(console.error);
