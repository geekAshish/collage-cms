import { Router } from "express";
import jwt from 'jsonwebtoken';
import { prismaClient } from "db/client";

import { auth } from "../middleware/auth";
import { SignupSchema } from "common/inputs";
import { TSSCli } from 'solana-mpc-tss-lib/mpc';


export const cli = new TSSCli('devnet');

export const MPC_SEVERS = [
  "",
  "",
  ""
];
export const MPC_THRSHOLD = Math.max(1, MPC_SEVERS.length - 1);


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

router.get("/calendar/:courseId", auth, async (req, res) => {
  const courseId = req.params.courseId;
  const course = await prismaClient.course.findFirst({
    where: {
      id: courseId
    }
  })

  const purchase = await prismaClient.purchase.findFirst({
    where: {
      userId: req.userId,
      courseId: courseId
    }
  })

  if (!purchase) {
    res.status(411).json({
      message: "You don't have access to the course"
    })
  }

  if (!course) {
    res.status(411).json({
      message: "Course with not found"
    })
  }

  res.json({
    id: course.id,
    calendarId: course.calendarNotionId
  })
})

router.get("/courses", auth, async (req, res) => {
  const courses = await prismaClient.course.findMany({
    where: {
      purchases: {
        some: {
          userId: req.userId,
        }
      }
    }
  })

  res.json({
    courses: courses.map((c) => {
      return {
        id: c.id,
        title: c.title,
        slug: c.slug
      }
    })
  })
})

router.post("/send", auth, async (req, res) => {
  const {success, data} = SendSchema.safeParse(req.body);

  const blockhash = await cli.recentBlockHash();

  if (!success) {
    res.status(403).json({
      message: "Incorrect credentials"
    })
  }

  const user = await prismaClient.user.findFirst({
    where: {id: req.userId}
  })

  if (!user) {
    res.status(403).json({
      message: "user not found"
    })
  }

  const step1Responses = await Promise.all(MPC_SEVERS.map(async (server) => {
    const response = await axios.post(`${server}/send/step-1`, {
      to: data?.to,
      amount: data?.amount,
      userId: req.userId,
      recentBlockhash: blockhash
    })

    return response.data.response;
  }))
  
  const step2Responses = await Promise.all(MPC_SEVERS.map(async (server, index) => {
    const response = await axios.post(`${server}/send/step-2`, {
      to: data?.to,
      amount: data?.amount,
      userId: req.userId,
      recentBlockhash: blockhash,
      step1Response: JSON.stringify(step1Responses[index]),
      allPublicNonces: step1Responses.map(r => r.publicNonces),
    })
    return response;
  }))

  const partialSignatures = step2Responses.map((r) => r.response);

  const transactionDetails = {
    amount: 1000000,
    to: 'destination-address',
    from: user.publicKey,
    network: 'devnet',
    memo: 'Multi-sig payment',
    recentBlockhash: blockhash
  };

  const signature = await cli.aggregateSignaturesAndBroadcast(
    JSON.stringify(partialSignatures),
    JSON.stringify(transactionDetails),
    JSON.stringify({
      aggregatedPublicKey: user.publicKey,
      participantKeys: step2Responses.map(r => r.publicKey),
      threshold: MPC_SEVERS
    }) // Pass the aggregated wallet info here
  );

  res.json({
    signature
  })

})

export default router;