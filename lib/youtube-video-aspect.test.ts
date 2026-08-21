import { describe, expect, it } from "vitest";
import { isLikelyYouTubeShort } from "./youtube-video-aspect";

describe("isLikelyYouTubeShort", () => {
  it("detecta URL de Shorts", () => {
    expect(isLikelyYouTubeShort("https://www.youtube.com/shorts/abc123XYZ_-0")).toBe(true);
  });

  it("watch normal não é short", () => {
    expect(isLikelyYouTubeShort("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(false);
  });
});
