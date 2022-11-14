import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import joi from "joi";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
let participants;
let messages;
let status;

mongoClient.connect().then(() => {
  db = mongoClient.db("uolapi");
  participants = db.collection("participants");
  messages = db.collection("messages");
  status = db.collection("status");
});

const participantsSchema = joi.object({
  name: joi.string().required(),
});

const messagesSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().required(),
});

//rotas de participantes

app.post("/participants", async (req, res) => {
  const participant = req.body;
  const validation = participantsSchema.validate(participant, {
    abortEarly: false,
  });

  // validação do formato dos inputs

  if (validation.error) {
    const erros = validation.error.details.map((detail) => detail.message);
    res.status(422).send(erros);
    return;
  }

  // verifica se o nome já existe

  try {
    const nameAlreadyExists = await participants.findOne({
      name: participant.name,
    });
    console.log(nameAlreadyExists)
    if (nameAlreadyExists) {
      res.status(409).send({ message: 'Este nome já existe' });
      return;
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message})
    return;
  }

  // insere novo participante no banco de dados

  try {
    await participants.insertOne({
      name: participant.name,
      lastStatus: Date.now(),
    });
  } catch (err) {
    console.log(err);
    res.status(422).send({ message: err.message });
    return;
  }

  // insere mensagem de entrada na sala

  try {
    await messages.insertOne({
      from: participant.name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: "HH:MM:SS",
    });
  } catch (err) {
    console.log(err);
    res.status(422).send({ message: err.message });
    return;
  }

  res.sendStatus(201);
});

app.get("/participants", async (req, res) => {

  // monstra todos os participantes

  try {
    const allParticipants = await participants.find().toArray();
    res.status(201).send(allParticipants);
  } catch (err) {
    res.status(404).send({ message: err.message });
  }
});

//rotas das mensagens

app.post("/messages", async (req, res) => {
  const uolmessage = req.body;
  const user = req.headers.user;
  const validation = messagesSchema.validate(uolmessage, { abortEarly: false });

  // validação do formato dos inputs

  if (validation.error) {
    const erros = validation.error.details.map((detail) => detail.message);
    res.status(422).send(erros);
    return;
  }

  // validação do tipo de mensagem

  if (uolmessage.type !== "message" && uolmessage.type !== "private_message") {
    res.status(422).send("tipo de mensagem não está no formato esperado");
    return;
  }

  //verifica se o remetente existe

  try {
    const nameExists = await participants.findOne({
      name: user,
    });
    if (!nameExists) {
      res.status(404).send({ message: 'Faça login para mandar uma mensagem' });
      return;
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message})
    return;
  }

  // insere a nova mensage

  try {
    await messages.insertOne({
        from: user,
        to: uolmessage.to,
        text: uolmessage.text,
        type: uolmessage.type,
        time: 'HH:MM:SS'
    })
  } catch(err) {
    console.log(err)
    res.status(422).send({message: err.message})
    return
  }

  res.sendStatus(201)

});

app.get("/messages", async (req, res) => {
    const user = req.headers.user
    let limit = req.query.limit
    const shownMessages = []

    // recebe e decide as mensagens que serão mostradas

    try {
        const allmessages = await messages.find().toArray()
        const userMessages = allmessages
        .filter((message) => 
        message.to === user || 
        message.from === user ||
        message.type ==='message'||
        message.type === 'status')
        .reverse()

        console.log(userMessages.length)
        // verifica o limite estabelecido pela query string

        if(limit > userMessages.length) {
            limit = userMessages.length
        }

        if (limit) {
            for (let index = 0; index < limit; index++) {
                shownMessages.push(userMessages[index])
            }
            res.status(201).send(shownMessages)
        } else {
            res.status(201).send(userMessages)
        }

    } catch(err) {
        console.log(err)
        res.status(500).send({message: err.message})
    }
})

//rota de status

app.post("/status", async (req, res) => {
    const user = req.headers.user

    try {
        const nameExists = await participants.findOne({name: user})
        if (!nameExists) {
            res.sendStatus(400)
            return
        } 
        console.log(nameExists);
        nameExists.lastStatus = Date.now()
        res.sendStatus(200)
    } catch(err) {
        res.status(500).send({message: err.message})
    }
})

app.listen(5000, () => console.log("app running on port 5000"));
