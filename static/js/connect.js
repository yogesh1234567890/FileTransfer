let localConnection;
let remoteConnection;
let sendChannel;
let receiveChannel;
let fileReader;
var iceCandidatesCollected = [];

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const bitrateDiv = document.querySelector("div#bitrate");
const fileInput = document.querySelector("input#fileInput");
const abortButton = document.querySelector("button#abortButton");
const downloadAnchor = document.querySelector("a#download");
const sendProgress = document.querySelector("progress#sendProgress");
const receiveProgress = document.querySelector("progress#receiveProgress");
const statusMessage = document.querySelector("span#status");
const sendFileButton = document.querySelector("button#sendFile");

var browserCode = document.querySelector("#browser-code").innerHTML;

let receiveBuffer = [];
let receivedSize = 0;
let bytesPrev = 0;
let timestampPrev = 0;
let timestampStart;
let statsInterval = null;
let bitrateMax = 0;
var peerConn;

let ws_scheme = window.location.protocol == "https:" ? "wss://" : "ws://";

async function websocket() {
  let endpoint =
    ws_scheme + window.location.host + `/ws/connect/${inputValue.value}/`;
  window.socket = new WebSocket(endpoint);

  socket.onopen = async function (e) {
    console.log("Connection established!");
  };

  socket.onmessage = async function (e) {
    const data = JSON.parse(e.data);
    document.querySelector("#chat-log").value += data.message + "\n";
    message_process(e);
  };

  socket.onerror = async function (e) {
    console.log("error", e);
  };

  socket.onclose = async function (e) {
    console.log("close", e);
  };
}

async function creatertcpeer() {
  peerConn = new RTCPeerConnection(configuration);

  peerConn.addEventListener("icecandidate", (event) => {
    console.log(event.candidate);
    if (event.candidate) {
      socket.send(
        JSON.stringify({
          msg_type: "candidate",
          // sender: sender,
          candidate: event.candidate,
        })
      );
    }
  });
}

async function message_process(e) {
  // const peerConn = new RTCPeerConnection(configuration);
  const data = JSON.parse(e.data);
  if (data.message.type === "offer") {
    if (data.sender !== browserCode) {
      remoteRTCMessage = data.message;
      await creatertcpeer();
      peerConn.setRemoteDescription(
        new RTCSessionDescription(remoteRTCMessage)
      );

      if (iceCandidatesCollected.length > 0) {
        for (let i = 0; i < iceCandidatesCollected.length; i++) {
            let candidate = iceCandidatesCollected[i];
            try {
                await peerConn.addIceCandidate(candidate)
            } catch (error) {
              console.log(error);
            }
        }
        iceCandidatesCollected = [];
    }

      const answer = await peerConn.createAnswer();
      await peerConn.setLocalDescription(answer);
      socket.send(
        JSON.stringify({
          msg_type: "answer",
          answer: answer,
          sender: data.sender,
          answerer: browserCode,
        })
      );
    }
  } else if (data.message.type === "answer") {
    if (data.answerer !== browserCode) {
      remoteRTCMessage = data.message;
      peerConn.setRemoteDescription(
        new RTCSessionDescription(remoteRTCMessage)
      );
      console.log("Answered");
    };

  }
  else if (data.message === "candidate") {
    console.log('candidateee');
    // if (data.fromUser !== "{{request.user.username}}") {
    try {
      if (peerConn) {
        data.candidate && (await peerConn.addIceCandidate(data.candidate));
      } else {
        iceCandidatesCollected.push(data.candidate);
      }
    } catch (e) {
    }
    // }
  }
};

fileInput.addEventListener("change", handleFileInputChange, false);
abortButton.addEventListener("click", () => {
  if (fileReader && fileReader.readyState === 1) {
    console.log("Abort read!");
    fileReader.abort();
  }
});

async function handleFileInputChange() {
  const file = fileInput.files[0];
  if (!file) {
    console.log("No file chosen");
  } else {
    sendFileButton.disabled = false;
  }
}

async function createConnection() {
  abortButton.disabled = false;
  sendFileButton.disabled = true;

  const localConnection = new RTCPeerConnection(configuration);
  sendChannel = localConnection.createDataChannel("sendDataChannel");
  sendChannel.binaryType = "arraybuffer";

  sendChannel.addEventListener("open", onSendChannelStateChange);
  sendChannel.addEventListener("close", onSendChannelStateChange);
  sendChannel.addEventListener("error", onError);

  await creatertcpeer();

  try {
    const offer = await localConnection.createOffer();
    // offer is RTCSessionDescription object
    await localConnection.setLocalDescription(offer);
    socket.send(
      JSON.stringify({
        msg_type: "offer",
        sender: browserCode,
        offer: offer,
      })
    );
  } catch (e) {
    console.log("Failed to create session description: ", e);
  }

  fileInput.disabled = true;
}

function closeDataChannels() {
  sendChannel.close();
  sendChannel = null;
  if (receiveChannel) {
    receiveChannel.close();
    receiveChannel = null;
  }
  localConnection.close();
  remoteConnection.close();
  localConnection = null;
  remoteConnection = null;
  console.log("Closed peer connections");

  // re-enable the file select
  fileInput.disabled = false;
  abortButton.disabled = true;
  sendFileButton.disabled = false;
}


async function gotRemoteDescription(desc) {
  await remoteConnection.setLocalDescription(desc);
  await localConnection.setRemoteDescription(desc);
}

function onSendChannelStateChange() {
  if (sendChannel) {
    const { readyState } = sendChannel;
    if (readyState === "open") {
      sendData();
    }
    onSendChannelStateChange;
  }
}

function onError(error) {
  if (sendChannel) {
    console.error("Error in sendChannel:", error);
    return;
  }
}

sendFileButton.addEventListener("click", () => createConnection());

const socketconnection = document.getElementById("connectButton");
var inputValue = document.getElementById("message");
socketconnection.addEventListener("click", () => {
  websocket();
  document.querySelector("#chatbutton").onclick = function (e) {
    const messageInputDom = document.querySelector("#chat");
    const message = messageInputDom.value;
    socket.send(
      JSON.stringify({
        message: message,
      })
    );
    messageInputDom.value = "";
  };
});
