import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb'
import joi from 'joi'
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
    db = mongoClient.db("uolapi")
    participants = db.collection("participants")
    messages = db.collection("messages")
    status = db.collection("status")
})

const participantsSchema = joi.object({
    name: joi.string().required()
})

app.post('/participants', async (req, res) => {
    const participant = req.body
    const validation = participantsSchema.validate(participant, {abortEarly: false})

    if (validation.error) {
        const erros =  validation.error.details.map((detail) => detail.message)
        res.status(422).send(erros)
        return
    }

    try {
        const nameAlreadyExists = await participants.findOne({name: participant.name})
        if (nameAlreadyExists) {
            res.status(409).send({message:err.message})
            return
        }
    } catch(err) {
        console.log(err)
        res.status(422).send('Este nome já existe.')
        return
    }

    try {
        await participants.insertOne({name: participant.name, lastStatus: Date.now()})
    } catch(err) {
        console.log(err)
        res.status(422).send({message: err.message})
        return
    }

    try {
        await messages.insertOne({from: participant.name, to:'Todos', text:'entra na sala...', type: 'status', time: 'HH:MM:SS'})
    }catch(err) {
        console.log(err)
        res.status(422).send({message: err.message})
        return
    }

    res.sendStatus(201)
})

app.get('/participants', async (req,res) => {

    try {
        const allParticipants = await participants.find().toArray()
        res.status(201).send(allParticipants)
    } catch(err) {
        res.status(404).send({message: err.message})
    }
})


app.listen(5000, () => console.log('app running on port 5000'))