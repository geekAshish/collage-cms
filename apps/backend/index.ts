import express from "express";
import cors from "cors"
import { prismaClient } from "db/client";
import { auth } from "./middleware/auth";

const PORT = 8080;

const app = express();


app.post("/signin", (req, res) => {

})

app.get("/calendar", auth, (req, res) => {
  
})


app.listen(PORT, () => {
  console.log(`running server on ${PORT}`);
})