import { z } from "zod";

const usernameSchema = z.string()
  .trim()
  .min(2, "아이디는 2자 이상이어야 합니다.")
  .max(20, "아이디는 20자까지 입력할 수 있습니다.")
  .regex(/^[가-힣a-zA-Z0-9_]+$/, "아이디에는 한글, 영문, 숫자, 밑줄만 사용할 수 있습니다.");

export const authSchema = z.object({
  username: usernameSchema,
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.")
});

export const signupSchema = authSchema;

export const postSchema = z.object({
  body: z.string().trim().min(1, "내용을 입력해 주세요.").max(2000, "게시물은 2,000자까지 작성할 수 있습니다."),
  gameId: z.string().uuid("게임을 선택해 주세요.")
});

export const profileSchema = z.object({
  username: usernameSchema,
  bio: z.string().trim().max(160, "소개는 160자까지 입력할 수 있습니다.")
});

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export function validateImages(files: File[], limit = 4) {
  if (files.length > limit) return `사진은 최대 ${limit}장까지 올릴 수 있습니다.`;
  for (const file of files) {
    if (!IMAGE_TYPES.includes(file.type)) return "JPG, PNG, WebP 이미지만 올릴 수 있습니다.";
    if (file.size > MAX_BYTES) return "이미지는 한 장당 10MB 이하여야 합니다.";
  }
  return null;
}
