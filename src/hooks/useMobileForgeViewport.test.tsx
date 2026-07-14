import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useMobileForgeBodyLock } from "./useMobileForgeViewport";

function BodyLockHarness({ active }: { active: boolean }) {
  useMobileForgeBodyLock(active);
  return null;
}

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove("scriptora-mobile-scroll-locked");
  document.body.classList.remove("scriptora-mobile-scroll-locked");
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.width = "";
  document.body.style.top = "";
});

describe("useMobileForgeBodyLock", () => {
  it("locks both document roots and restores their previous inline styles", () => {
    document.documentElement.style.overflow = "clip";
    document.body.style.overflow = "auto";
    document.body.style.position = "relative";
    document.body.style.width = "75%";
    document.body.style.top = "2px";

    const view = render(<BodyLockHarness active />);

    expect(document.documentElement).toHaveClass("scriptora-mobile-scroll-locked");
    expect(document.body).toHaveClass("scriptora-mobile-scroll-locked");
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.width).toBe("100%");

    view.rerender(<BodyLockHarness active={false} />);

    expect(document.documentElement).not.toHaveClass("scriptora-mobile-scroll-locked");
    expect(document.body).not.toHaveClass("scriptora-mobile-scroll-locked");
    expect(document.documentElement.style.overflow).toBe("clip");
    expect(document.body.style.overflow).toBe("auto");
    expect(document.body.style.position).toBe("relative");
    expect(document.body.style.width).toBe("75%");
    expect(document.body.style.top).toBe("2px");
  });

  it("keeps the document locked until the final nested consumer releases it", () => {
    const first = render(<BodyLockHarness active />);
    const second = render(<BodyLockHarness active />);

    first.unmount();
    expect(document.body).toHaveClass("scriptora-mobile-scroll-locked");

    second.unmount();
    expect(document.documentElement).not.toHaveClass("scriptora-mobile-scroll-locked");
    expect(document.body).not.toHaveClass("scriptora-mobile-scroll-locked");
  });
});
