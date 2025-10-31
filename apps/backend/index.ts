import express from "express";
import cors from "cors"

import { auth } from "./middleware/auth";
import { SignupSchema } from "common/inputs";

import jwt from 'jsonwebtoken'

const PORT = 8080;

const app = express();
app.use(cors());
app.use(express.json());

app.use("/user", userRouter);
app.use("/admin", adminRouter);


app.listen(PORT, () => {
  console.log(`running server on ${PORT}`);
})