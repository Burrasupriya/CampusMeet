module.exports = {
  worker: {
    rtcMinPort: 40000,
    rtcMaxPort: 49999
  },
  router: {
    mediaCodecs: [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2
      },
      {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: {}
      }
    ]
  },
  webRtcTransport: {
    listenIps: [{ ip: "127.0.0.1", announcedIp: null }],

    enableUdp: true,
    enableTcp: true,
    preferUdp: true
  }
};
