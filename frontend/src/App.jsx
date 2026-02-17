import { useRef, useState } from "react";
import { io } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";

const socket = io("http://localhost:3000");

function App() {

  const localVideoRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);

  const [joined, setJoined] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState([]);

  // ---------------- JOIN CALL ----------------

  const joinCall = async () => {

    setJoined(true);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    localVideoRef.current.srcObject = stream;

    socket.emit("getRtpCapabilities", async (rtpCapabilities) => {

      deviceRef.current = new mediasoupClient.Device();
      await deviceRef.current.load({
        routerRtpCapabilities: rtpCapabilities
      });

     await createRecvTransport();
await createSendTransport(stream);

// small delay to ensure recv transport ready
setTimeout(() => {
  socket.emit("getProducers", (producerIds) => {
    producerIds.forEach(id => consume(id));
  });
}, 500);

    });
  };

  // ---------------- SEND ----------------

  const createSendTransport = async (stream) => {

    socket.emit("createTransport", { sender: true }, (params) => {

      sendTransportRef.current =
        deviceRef.current.createSendTransport(params);

      sendTransportRef.current.on(
        "connect",
        ({ dtlsParameters }, callback) => {
          socket.emit("connectTransport", {
            transportId: sendTransportRef.current.id,
            dtlsParameters
          });
          callback();
        }
      );

      sendTransportRef.current.on(
        "produce",
        ({ kind, rtpParameters }, callback) => {
          socket.emit("produce", {
            transportId: sendTransportRef.current.id,
            kind,
            rtpParameters
          }, ({ id }) => callback({ id }));
        }
      );

      stream.getTracks().forEach(track => {
        sendTransportRef.current.produce({ track });
      });
    });
  };

  // ---------------- RECEIVE ----------------

  const createRecvTransport = async () => {

    socket.emit("createTransport", { sender: false }, (params) => {

      recvTransportRef.current =
        deviceRef.current.createRecvTransport(params);

      recvTransportRef.current.on(
        "connect",
        ({ dtlsParameters }, callback) => {
          socket.emit("connectTransport", {
            transportId: recvTransportRef.current.id,
            dtlsParameters
          });
          callback();
        }
      );

      socket.on("newProducer", ({ producerId }) => {
         console.log("New producer:", producerId);
        consume(producerId);
      });
    });
  };

  const consume = async (producerId) => {

    if (!recvTransportRef.current) return;

    socket.emit("consume", {
      producerId,
      transportId: recvTransportRef.current.id,
      rtpCapabilities: deviceRef.current.rtpCapabilities
    }, async (params) => {

      if (!params) return;

      const consumer =
        await recvTransportRef.current.consume(params);

      const stream = new MediaStream();
      stream.addTrack(consumer.track);

      addRemoteStream(stream);
    });
  };

  const addRemoteStream = (stream) => {
    setRemoteStreams(prev => [...prev, stream]);
  };

  // ---------------- UI ----------------

  return (
    <div style={{ textAlign: "center" }}>

      <h2>Mediasoup Meet</h2>

      <button onClick={joinCall} disabled={joined}>
        Join Call
      </button>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "10px",
        justifyContent: "center",
        marginTop: "30px"
      }}>

        {/* Local Video */}
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          width="300"
          style={{ borderRadius: "10px" }}
        />

        {/* Remote Videos */}
        {remoteStreams.map((stream, index) => (
          <video
            key={index}
            autoPlay
            playsInline
            width="300"
            style={{ borderRadius: "10px" }}
            ref={video => {
              if (video) video.srcObject = stream;
            }}
          />
        ))}

      </div>
    </div>
  );
}

export default App;
