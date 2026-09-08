import { describe, expect, it } from "vitest";
import { postSchema, signupSchema, validateAttachments, validateImages } from "@/lib/validation";

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

  it("accepts Blender and Excel attachments", () => {
    expect(validateAttachments([
      new File(["blend"], "scene.blend", { type: "application/octet-stream" }),
      new File(["sheet"], "scores.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    ])).toBeNull();
  });

  it("accepts executable files and rejects more than three attachments", () => {
    expect(validateAttachments([new File(["x"], "installer.exe")])).toBeNull();
    const files = Array.from({ length: 4 }, (_, index) => new File(["x"], `${index}.zip`, { type: "application/zip" }));
    expect(validateAttachments(files)).toContain("최대 3개");
  });
});
