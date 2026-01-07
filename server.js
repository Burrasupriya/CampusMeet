// const express = require("express");
// const http = require("http");
// const WebSocket = require("ws");

// const app = express();
// const server = http.createServer(app);
// const wss = new WebSocket.Server({ server });

// app.use(express.static("public"));

// // roomId -> Set of clients
// const rooms = new Map();

// wss.on("connection", (ws) => {
//   ws.roomId = null;

//   ws.on("message", (message) => {
//     const msg = JSON.parse(message.toString());

//     // JOIN ROOM
//     if (msg.type === "join") {
//       ws.roomId = msg.roomId;

//       if (!rooms.has(ws.roomId)) {
//         rooms.set(ws.roomId, new Set());
//       }

//       rooms.get(ws.roomId).add(ws);

//       // notify other users in room
//       rooms.get(ws.roomId).forEach(client => {
//         if (client !== ws) {
//           client.send(JSON.stringify({ type: "user-joined" }));
//         }
//       });
//     }

//     // SIGNALING (offer / answer / ice)
//     if (msg.type === "signal") {
//       rooms.get(ws.roomId)?.forEach(client => {
//         if (client !== ws) {
//           client.send(JSON.stringify({
//             type: "signal",
//             data: msg.data
//           }));
//         }
//       });
//     }
//   });

//   ws.on("close", () => {
//     if (ws.roomId && rooms.has(ws.roomId)) {
//       rooms.get(ws.roomId).delete(ws);
//     }
//   });
// });

// // REQUIRED for Render
// const PORT = process.env.PORT || 3000;

// server.listen(PORT, () => {
//   console.log("Server running on port", PORT);
// });

const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

// roomId -> set of clients
const rooms = new Map();

wss.on("connection", (ws) => {
  ws.roomId = null;

  ws.on("message", (message) => {
    const msg = JSON.parse(message.toString());

    // JOIN ROOM
    if (msg.type === "join") {
      ws.roomId = msg.roomId;

      if (!rooms.has(ws.roomId)) {
        rooms.set(ws.roomId, new Set());
      }

      rooms.get(ws.roomId).add(ws);

      // notify others
      rooms.get(ws.roomId).forEach(client => {
        if (client !== ws) {
          client.send(JSON.stringify({ type: "user-joined" }));
        }
      });
    }

    // SIGNALING (offer / answer / candidate)
    if (msg.type === "signal") {
      rooms.get(ws.roomId)?.forEach(client => {
        if (client !== ws) {
          client.send(JSON.stringify({
            type: "signal",
            data: msg.data
          }));
        }
      });
    }
  });

  ws.on("close", () => {
    if (ws.roomId && rooms.has(ws.roomId)) {
      rooms.get(ws.roomId).delete(ws);
    }
  });
});

// REQUIRED for Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
