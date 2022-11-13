import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const mongoClient = new MongoClient(process.env.MONGO_URI)
let db
let participants
let messages
let status

mongoClient.connect().then(() => {
    db = mongoClient("uolapi")
    participants = db.collection("participants")
    messages = db.collection("messages")
    status = db.collection("status")
})

app.listen(5000, () => console.log('app running on port 5000'))