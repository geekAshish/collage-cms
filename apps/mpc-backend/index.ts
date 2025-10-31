import express, { json, response } from 'express'
import { prismaClient } from 'mpc-db/client';
import { TSSCli } from 'solana-mpc-tss-lib/mpc';

const cli = new TSSCli('devnet');

// config
const PORT = 8081;

const app = express();


app.post("/create-user", async (req, res) => {
  const { userId } = req.body;
  
  const participant1 = await cli.generate();
  prismaClient.keyShare.create({
    data: {
      userId,
      publicKey: participant1.publicKey,
      secretKey: participant1.secretKey
    }
  })

  res.json({
    publicKey: participant1.publicKey
  })
})

app.post('/send/step-1', async (req, res) => {
  const {to, amount, userId, recentBlockhash} = req.body;
  
  const user = await prismaClient.keyShare.findFirst({
    where: {
      userId
    }
  })
  
  if (!user) {
    res.status(403).json({
      message: "user not found"
    })
  }

  const response = await cli.aggregateSignStepOne(
    user.secretKey,
    to,
    amount,
    'Multi-sig payment',
    recentBlockhash
  );

  res.json({
    response
  })
})

app.post('/send/step-1', async (req, res) => {
  const { to, amount, userId, recentBlockhash, step1Response, allPublicNonces } = req.body;
  const user = await prismaClient.keyShare.findFirst({
    where: {
      userId
    }
  })
  
  if (!user) {
    res.status(403).json({
      message: "user not found"
    })
  }

  const response = await cli.aggregateSignStepTwo(
    step1Response,
    user.secretKey,
    to,
    amount,
    allPublicNonces,
    undefined,
    recentBlockhash
  );

  res.json({
    response,
    publicKey: user.publicKey
  })
})


app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
})
