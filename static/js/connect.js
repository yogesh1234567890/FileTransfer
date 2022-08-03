let localConnection;
let remoteConnection;
let sendChannel;
let receiveChannel;
let fileReader;
var iceCandidatesCollected = [];


const configuration = {
  iceServers: [
      {
          urls: 'stun:stun.filesharenow.tech'
      },
      {
          urls: 'turn:turn.filesharenow.tech:3478?transport=udp',
          username: 'guest',
          credential: 'somepassword'
      }
  ]
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


function sendData() {
  const file = fileInput.files[0];
  console.log(`File is ${[file.name, file.size, file.type, file.lastModified].join(' ')}`);
  socket.send(
    JSON.stringify({
      msg_type: "file_info",
      data: {
        name: file.name,
        size: file.size
      },
    })
  );

  // Handle 0 size files.
  statusMessage.textContent = '';
  downloadAnchor.textContent = '';
  if (file.size === 0) {
    bitrateDiv.innerHTML = '';
    statusMessage.textContent = 'File is empty, please select a non-empty file';
    closeDataChannels();
    return;
  }
  sendProgress.max = file.size;
  receiveProgress.max = file.size;
  const chunkSize = 16384;
  fileReader = new FileReader();
  let offset = 0;
  fileReader.addEventListener('error', error => console.error('Error reading file:', error));
  fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
  fileReader.addEventListener('load', e => {
    console.log('FileRead.onload ', e);
    sendChannel.send(e.target.result);
    offset += e.target.result.byteLength;
    sendProgress.value = offset;
    if (offset < file.size) {
      readSlice(offset);
    }
  });
  const readSlice = o => {
    console.log('readSlice ', o);
    const slice = file.slice(offset, o + chunkSize);
    fileReader.readAsArrayBuffer(slice);
  };
  readSlice(0);
}

async function websocket() {
  let endpoint =
    ws_scheme + window.location.host + `/ws/connect/${inputValue.value}/`;
  window.socket = new WebSocket(endpoint);

  socket.onopen = async function (e) {
    console.log("Connection established!");
  };

  socket.onmessage = async function (e) {
    const data = JSON.parse(e.data);
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
  // peerConn = new RTCPeerConnection();

  peerConn.addEventListener("icecandidate", (event) => {
    console.log('Local ICE candidate: ', event.candidate);
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
  peerConn.addEventListener('datachannel', receiveChannelCallback);

}

function receiveChannelCallback(event) {
  console.log('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.binaryType = 'arraybuffer';
  receiveChannel.onmessage = onReceiveMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;

  receivedSize = 0;
  bitrateMax = 0;
  downloadAnchor.textContent = '';
  downloadAnchor.removeAttribute('download');
  if (downloadAnchor.href) {
    URL.revokeObjectURL(downloadAnchor.href);
    downloadAnchor.removeAttribute('href');
  }
}

function onReceiveMessageCallback(event) {
  console.log(`Received Message ${event.data.byteLength}`);
  receiveBuffer.push(event.data);
  receivedSize += event.data.byteLength;
  receiveProgress.value = receivedSize;

  // we are assuming that our signaling protocol told
  // about the expected file size (and name, hash, etc).
  const file = fileInput.files[0];
  if (receivedSize === file_information.size) {
    const received = new Blob(receiveBuffer);
    receiveBuffer = [];

    downloadAnchor.href = URL.createObjectURL(received);
    downloadAnchor.download = file_information.name;
    downloadAnchor.textContent =
      `Click to download '${file_information.name}' (${file_information.size} bytes)`;
    downloadAnchor.style.display = 'block';

    const bitrate = Math.round(receivedSize * 8 /
      ((new Date()).getTime() - timestampStart));
    bitrateDiv.innerHTML =
      `<strong>Average Bitrate:</strong> ${bitrate} kbits/sec (max: ${bitrateMax} kbits/sec)`;

    if (statsInterval) {
      clearInterval(statsInterval);
      statsInterval = null;
    }

    // closeDataChannels();
  }
}


async function onReceiveChannelStateChange() {
  if (receiveChannel) {
    const readyState = receiveChannel.readyState;
    console.log(`Receive channel state is: ${readyState}`);
    if (readyState === 'open') {
      timestampStart = (new Date()).getTime();
      timestampPrev = timestampStart;
      statsInterval = setInterval(displayStats, 500);
      await displayStats();
    }
  }
}

// display bitrate statistics.
async function displayStats() {
  if (remoteConnection && remoteConnection.iceConnectionState === 'connected') {
    const stats = await remoteConnection.getStats();
    let activeCandidatePair;
    stats.forEach(report => {
      if (report.type === 'transport') {
        activeCandidatePair = stats.get(report.selectedCandidatePairId);
      }
    });
    if (activeCandidatePair) {
      if (timestampPrev === activeCandidatePair.timestamp) {
        return;
      }
      // calculate current bitrate
      const bytesNow = activeCandidatePair.bytesReceived;
      const bitrate = Math.round((bytesNow - bytesPrev) * 8 /
        (activeCandidatePair.timestamp - timestampPrev));
      bitrateDiv.innerHTML = `<strong>Current Bitrate:</strong> ${bitrate} kbits/sec`;
      timestampPrev = activeCandidatePair.timestamp;
      bytesPrev = bytesNow;
      if (bitrate > bitrateMax) {
        bitrateMax = bitrate;
      }
    }
  }
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

  else if (data.message === "file_information") {
    window.file_information = data.data;
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

  await creatertcpeer();

  // const localConnection = new RTCPeerConnection(configuration);
  sendChannel = peerConn.createDataChannel("sendDataChannel");
  sendChannel.binaryType = "arraybuffer";

  sendChannel.addEventListener("open", onSendChannelStateChange);
  sendChannel.addEventListener("close", onSendChannelStateChange);
  sendChannel.addEventListener("error", onError);

  peerConn.addEventListener('datachannel', event => {
    const dataChannel = event.channel;
    console.log('datachannel', dataChannel);
});


  try {
    const offer = await peerConn.createOffer();
    // offer is RTCSessionDescription object
    await peerConn.setLocalDescription(offer);
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


function onSendChannelStateChange() {
  if (sendChannel) {
    const { readyState } = sendChannel;
    if (readyState === "open") {
      console.log("Send channel is open");
      sendData();
    }
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
