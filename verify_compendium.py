from playwright.sync_api import sync_playwright

def run_cuj(page):
    # Navigate to compendium index on preview server
    page.goto("http://localhost:4173/compendium")
    page.wait_for_timeout(1500)

    # Click Fixed Field Alphas link
    page.get_by_role("link", name="Fixed Field Alphas").click()
    page.wait_for_timeout(1500)

    # Click collapsible trigger
    button = page.get_by_text("What this can and can't tell you")
    print("Button count:", button.count())
    if button.count() > 0:
        button.click()
        page.wait_for_timeout(1000)

    page.screenshot(path="/home/jules/verification/screenshots/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
