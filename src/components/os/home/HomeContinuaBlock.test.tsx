import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HomeContinuaBlock } from "@/components/os/home/HomeContinuaBlock";

describe("HomeContinuaBlock", () => {
  it("routes empty state to onNewBook (One Flow entry)", () => {
    const onNewBook = vi.fn();
    const onContinue = vi.fn();

    render(
      <HomeContinuaBlock
        project={null}
        progressPercent={0}
        onContinue={onContinue}
        onNewBook={onNewBook}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /continua a scrivere/i }));

    expect(onNewBook).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("continues active project when one exists", () => {
    const onNewBook = vi.fn();
    const onContinue = vi.fn();

    render(
      <HomeContinuaBlock
        project={{
          id: "p1",
          config: { title: "Il mio romanzo" },
          chapters: [],
          updatedAt: Date.now(),
        } as any}
        progressPercent={42}
        onContinue={onContinue}
        onNewBook={onNewBook}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /continua a scrivere/i }));

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onNewBook).not.toHaveBeenCalled();
  });
});
