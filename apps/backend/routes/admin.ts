import { Router } from "express";
import jwt from 'jsonwebtoken';
import { prismaClient } from "db/client";

import { authAdmin } from "../middleware/auth";
import { SignupSchema } from "common/inputs";

const MPC_SEVERS = [
  "",
  "",
  ""
]

const router = Router()

router.post("/signin", async (req, res) => {
  const {success, data} = SignupSchema.safeParse(req.body);
  if(!success) {
    res.status(403).json({
      message: "Incorrect credentials"
    })
    return;
  }

  const email = data.email;
  const password = data.password;

  const user = await prismaClient.findFirst({
    where: {
      email
    }
  })

  if (!user) {
    res.status(400).json({
      message: "User Not Found"
    })
  }

  // TODO : ADD PASSWORD HASHING
  if(user.password !== password) {
    res.status(403).json({
      message: "Incorrect creds"
    })
  }

  const token = jwt.sign({
    userId: user.id
  }, "secretid")

  res.json({
    token
  })
})



router.post("/create-user", authAdmin, async (req, res) => {
  const {success, data} = SignupSchema.safeParse(req.body);

  if (!success) {
    res.status(403).json({
      message: "Incorrect credentials"
    })
  }
})


export default router;

