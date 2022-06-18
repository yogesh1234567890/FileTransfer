// import { ReconnectingWebSocket } from "./reconnecting-websocket.min.js";

let ws_scheme = window.location.protocol == "https:" ? "wss://" : "ws://";

let sendChannel;

async function gotLocalDescription(desc) {
  await localConnection.setLocalDescription(desc);
  console.log(`Offer from localConnection\n ${desc.sdp}`);
  await remoteConnection.setRemoteDescription(desc);
  try {
    const answer = await remoteConnection.createAnswer();
    await gotRemoteDescription(answer);
  } catch (e) {
    console.log("Failed to create session description: ", e);
  }
}

function onSendChannelStateChange() {
  if (sendChannel) {
    const { readyState } = sendChannel;
    console.log(`Send channel state is: ${readyState}`);
    if (readyState === "open") {
      sendData();
    }
  }
}
const sendFileButton = document.querySelector("button#sendButton12");

sendFileButton.addEventListener("click", () => createConnection());

async function createConnection() {
  // abortButton.disabled = false;
  // sendFileButton.disabled = true;
  localConnection = new RTCPeerConnection();
  console.log("Created local peer connection object localConnection");

  sendChannel = localConnection.createDataChannel("sendDataChannel");
  sendChannel.binaryType = "arraybuffer";
  console.log("Created send data channel", sendChannel);

  sendChannel.addEventListener("open", onSendChannelStateChange);
  sendChannel.addEventListener("close", onSendChannelStateChange);
  // sendChannel.addEventListener('error', onError);

  localConnection.addEventListener("icecandidate", async (event) => {
    console.log("Local ICE candidate: ", event.candidate);
    await remoteConnection.addIceCandidate(event.candidate);
  });

  remoteConnection = new RTCPeerConnection();
  console.log("Created remote peer connection object remoteConnection");

  remoteConnection.addEventListener("icecandidate", async (event) => {
    console.log("Remote ICE candidate: ", event.candidate);
    await localConnection.addIceCandidate(event.candidate);
  });
  // remoteConnection.addEventListener('datachannel', receiveChannelCallback);

  try {
    const offer = await localConnection.createOffer();
    await gotLocalDescription(offer);
  } catch (e) {
    console.log("Failed to create session description: ", e);
  }

  // fileInput.disabled = true;
}

const socketconnection = document.getElementById("connectButton");
var inputValue = document.getElementById("message");
socketconnection.addEventListener("click", () => {
  console.log(inputValue.value);
  let endpoint =
    ws_scheme + window.location.host + `/ws/connect/${inputValue.value}/`;
  var socket = new WebSocket(endpoint);

  socket.onopen = async function (e) {
    console.log("Connection established!");
  };

  socket.onmessage = async function (e) {
    console.log("message", e);
  };

  socket.onerror = async function (e) {
    console.log("error", e);
  };

  socket.onclose = async function (e) {
    console.log("close", e);
  };
});
