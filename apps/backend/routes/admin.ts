import { Router } from "express";
import jwt from 'jsonwebtoken';
import { prismaClient } from "db/client";

import { authAdmin } from "../middleware/auth";
import { CreateUserSchema, SendSchema, SignupSchema } from "common/inputs";

import { TSSCli } from 'solana-mpc-tss-lib/mpc';

const cli = new TSSCli('devnet');

const MPC_SEVERS = [
  "",
  "",
  ""
];
const MPC_THRSHOLD = Math.max(1, MPC_SEVERS.length - 1);

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
  const {success, data} = CreateUserSchema.safeParse(req.body);

  if (!success) {
    res.status(403).json({
      message: "Incorrect credentials"
    })
  }

  const user = await prismaClient.user.create({
    data: {
      email: data?.email,
      password: data?.password,
      phone: data?.phone,
      role: "USER"
    }
  })

  const responses = await Promise.all(MPC_SEVERS.map(async (server) => {
    const response = await axios.post(`${server}/create-user`, {
      userId: user.id
    });
    return response.data
  }))

  const aggregatedPublicKey = cli.aggregateKeys(responses.map((r) => r.publicKey), MPC_THRSHOLD);

  await prismaClient.user.update({
    where: {id: user.id},
    data: {
      publicKey: aggregatedPublicKey.aggregatedPublicKey
    }
  })

  await cli.airdrop(aggregatedPublicKey.aggregatedPublicKey, 1000000000)

  res.json({
    message: "user created",
    user
  })
})



router.post("/send", authAdmin, async (req, res) => {
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

    return response.data
  }))
  
  const step2Responses = await Promise.all(MPC_SEVERS.map(async (server, index) => {
    const response = await axios.post(`${server}/send/step-2`, {
      to: data?.to,
      amount: data?.amount,
      userId: req.userId,
      recentBlockhash: blockhash,
      step1Response: JSON.stringify(step1Responses[index]),
      allPublicNonces: step1Responses.map(r => r.response.publicNonces),
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
