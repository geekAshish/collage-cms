import express from "express";
import cors from "cors"
import { prismaClient } from "db/client";
import { auth } from "./middleware/auth";
import { SignupSchema } from "common/inputs";

import jwt from 'jsonwebtoken'

const PORT = 8080;

const app = express();
app.use(cors());
app.use(express.json());

app.post("/signin", async (req, res) => {
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

app.get("/calendar/:courseId", auth, async (req, res) => {
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

app.get("/courses", auth, async (req, res) => {
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


app.listen(PORT, () => {
  console.log(`running server on ${PORT}`);
})