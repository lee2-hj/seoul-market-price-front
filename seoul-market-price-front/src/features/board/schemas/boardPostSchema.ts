import { z } from "zod";

export const boardPostSchema = z.object({
  title: z
    .string()
    .min(1, "제목을 입력하세요")
    .max(20, "제목은 최대 20자까지 입력 가능합니다."),
  content: z.string().min(1, "내용을 입력하세요"),
});

export type BoardPostFormData = z.infer<typeof boardPostSchema>;
