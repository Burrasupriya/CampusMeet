const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mediasoup = require("mediasoup");
const config = require("./mediasoupConfig");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

let worker;
let router;
let transports = [];
let producers = [];
let consumers = [];

async function createWorker() {
  worker = await mediasoup.createWorker(config.worker);
  router = await worker.createRouter({
    mediaCodecs: config.router.mediaCodecs
  });
  console.log("Mediasoup Worker Created");
}

createWorker();

io.on("connection", socket => {

  console.log("Client connected:", socket.id);

  socket.on("getRtpCapabilities", callback => {
    callback(router.rtpCapabilities);
  });

  socket.on("createTransport", async ({ sender }, callback) => {

    const transport = await router.createWebRtcTransport(
      config.webRtcTransport
    );

    transports.push({
      socketId: socket.id,
      transport
    });

    callback({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    });
  });

  socket.on("connectTransport", async ({ transportId, dtlsParameters }) => {

    const transport = transports.find(
      t => t.transport.id === transportId
    ).transport;

    await transport.connect({ dtlsParameters });
  });

  socket.on("produce", async ({ transportId, kind, rtpParameters }, callback) => {

    const transport = transports.find(
      t => t.transport.id === transportId
    ).transport;

    const producer = await transport.produce({
      kind,
      rtpParameters
    });

    producers.push({
      socketId: socket.id,
      producer
    });

    console.log("Producer created:", producer.id);

    // IMPORTANT: Only notify other clients
    socket.broadcast.emit("newProducer", {
      producerId: producer.id
    });

    callback({ id: producer.id });
  });

  socket.on("getProducers", callback => {

    const producerIds = producers
      .filter(p => p.socketId !== socket.id)
      .map(p => p.producer.id);

    callback(producerIds);
  });

  socket.on("consume", async ({ producerId, transportId, rtpCapabilities }, callback) => {

    if (!router.canConsume({ producerId, rtpCapabilities })) {
      return callback(null);
    }

    const transport = transports.find(
      t => t.transport.id === transportId
    ).transport;

    const consumer = await transport.consume({
  producerId,
  rtpCapabilities,
  paused: true   // start paused
});

consumers.push({
  socketId: socket.id,
  consumer
});

console.log("Consume requested for:", producerId);

// Send consumer params to client
callback({
  id: consumer.id,
  producerId,
  kind: consumer.kind,
  rtpParameters: consumer.rtpParameters
});

// 🔥 VERY IMPORTANT: resume after client is ready
await consumer.resume();

    consumers.push({
      socketId: socket.id,
      consumer
    });

    console.log("Consume requested for:", producerId);

    callback({
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });

});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
