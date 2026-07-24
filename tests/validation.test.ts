import { describe, expect, it } from "vitest";
import { postSchema, signupSchema, validateImages } from "@/lib/validation";

describe("community validation", () => {
  it("accepts a valid Korean nickname", () => {
    expect(signupSchema.safeParse({
      password: "password123", username: "게임고수_7"
    }).success).toBe(true);
  });

  it("rejects invalid and short nicknames", () => {
    expect(signupSchema.safeParse({
      password: "password123", username: "!"
    }).success).toBe(false);
  });

  it("limits post body and requires a UUID game id", () => {
    expect(postSchema.safeParse({ body: "GG!", gameId: "4655b0a2-4718-4bda-8843-26a434ab8f20" }).success).toBe(true);
    expect(postSchema.safeParse({ body: "", gameId: "game" }).success).toBe(false);
  });

  it("rejects more than four images", () => {
    const files = Array.from({ length: 5 }, (_, index) => new File(["image"], `${index}.png`, { type: "image/png" }));
    expect(validateImages(files)).toContain("최대 4장");
  });

  it("rejects unsupported image types", () => {
    expect(validateImages([new File(["x"], "clip.gif", { type: "image/gif" })])).toContain("JPG");
  });
});
