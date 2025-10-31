import express from 'express'
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


app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
})
