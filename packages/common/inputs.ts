import z from "zod";

export const SignupSchema = z.object({
  email: z.string(),
  password: z.string()
})


export const CreateUserSchema = z.object({
  email: z.string(),
  password: z.string(),
  phone: z.string
})
