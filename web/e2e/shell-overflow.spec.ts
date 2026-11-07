import { expect, test } from "@playwright/test";

test("screen entrances stay within the viewport while navigation remains usable", async ({ page }, info) => {
  await page.addInitScript(() => {
    localStorage.setItem("thinkbee-welcome-seen", "1");
    const animate = Element.prototype.animate;
    // Hold real shell animations so fast machines also exercise their overflowing frames.
    Element.prototype.animate = function (keyframes, options) {
      const animation = animate.call(this, keyframes, options);
      if (this.classList.contains("shell-content")) animation.pause();
      return animation;
    };
  });
  await page.goto("/");
  const content = page.locator(".shell-content");
  await expect(content).toHaveCSS("transform", "matrix(1, 0, 0, 1, 24, 0)");

  const checkFrames = async () => {
    for (const progress of [0, 0.5, 0.99]) {
      const dimensions = await content.evaluate((element, fraction) => {
        const animation = element.getAnimations()[0];
        const duration = Number(animation.effect!.getTiming().duration);
        animation.currentTime = duration * fraction;
        return { page: document.documentElement.scrollWidth, viewport: innerWidth };
      }, progress);
      expect(dimensions.page, `page width at ${progress * 100}% of entrance`).toBeLessThanOrEqual(dimensions.viewport);
    }
  };
  await checkFrames();
  const nav = page.locator(info.project.name.startsWith("mobile") ? ".mobile-navigation" : ".rail-destinations");
  await nav.getByRole("link", { name: "Records", exact: true }).click();
  await expect(page).toHaveURL(/\/records$/);
  await expect(content).toHaveCSS("transform", "matrix(1, 0, 0, 1, 24, 0)");
  await checkFrames();
  await expect(nav.getByRole("link", { name: "Records", exact: true })).toHaveAttribute("aria-current", "page");
});
