let ws;
let pc;
let localStream;

const roomId = "room1";

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

async function join() {
  try {
    // 1️⃣ Camera + mic
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
  } catch (err) {
    alert("Camera/Mic permission failed: " + err.message);
    return;
  }

  // Show local preview
  localVideo.srcObject = localStream;
  await localVideo.play();

  // 2️⃣ Decide WebSocket protocol
  let protocol;
  if (location.protocol === "https:") {
    protocol = "wss";
  } else {
    protocol = "ws";
  }

  // Create WebSocket ONCE
  ws = new WebSocket(protocol + "://" + location.host);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: "join",
      roomId
    }));
  };

  // 3️⃣ Create WebRTC PeerConnection
  pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
    ]
  });

  // 4️⃣ Add local tracks
  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  // 5️⃣ Receive remote stream
  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.play();
  };

  // 6️⃣ ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({
        type: "signal",
        data: { candidate: event.candidate }
      }));
    }
  };

  // 7️⃣ Handle signaling
  ws.onmessage = async (event) => {
    const msg = JSON.parse(event.data);

    // First user creates offer
    if (msg.type === "user-joined") {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      ws.send(JSON.stringify({
        type: "signal",
        data: { offer }
      }));
    }

    if (msg.type === "signal") {

      if (msg.data.offer) {
        await pc.setRemoteDescription(msg.data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        ws.send(JSON.stringify({
          type: "signal",
          data: { answer }
        }));
      }

      if (msg.data.answer) {
        await pc.setRemoteDescription(msg.data.answer);
      }

      if (msg.data.candidate) {
        await pc.addIceCandidate(msg.data.candidate);
      }
    }
  };
}
