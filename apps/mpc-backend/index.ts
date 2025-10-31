import express from 'express'

// config
const PORT = 8081;

const app = express();


app.post("/create-user", (req, res) => {
  const { userId } = req.body;

  
})


app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
})
