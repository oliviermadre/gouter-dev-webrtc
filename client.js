const ws = new WebSocket('wss://{{WEBSOCKET_HOSTNAME}}')
const clog = function(msg) {
    console.log(msg);
    let c = document.querySelector("#console");
    c.innerHTML = c.innerHTML + msg + "<br />";
}

ws.onopen = () => {
    console.log('Connected to the signaling server')
}

ws.onerror = err => {
    console.error(err)
}

ws.onmessage = msg => {
    const data = JSON.parse(msg.data)

    switch (data.type) {
        case 'login':
            clog('WS onmessage handleLogin');
            handleLogin(data.success)
            break
        case 'offer':
            clog('WS onmessage handleOffer');
            handleOffer(data.offer, data.username)
            break
        case 'answer':
            clog('WS onmessage handleAnswer');
            handleAnswer(data.answer)
            break
        case 'candidate':
            clog('WS onmessage handleCandidate');
            handleCandidate(data.candidate)
            break
        case 'close':
            clog('WS onmessage handleClose');
            handleClose()
            break
        default:
            break
    }
}

let connection = null
let name = null
let remoteUsername = null
let localStream = null;
let inCall = false;
let indexUsedVideoSource = null;

const sendMessage = message => {
    if (remoteUsername) {
        message.otherUsername = remoteUsername
    }

    ws.send(JSON.stringify(message))
}

document.querySelector('div#call').style.display = 'none'

document.querySelector('button#login').addEventListener('click', event => {
    username = document.querySelector('input#username').value

    if (username.length < 0) {
        alert('Please enter a username 🙂')
        return
    }

    sendMessage({ type: 'login', username: username })
})

document.querySelector('#toggle-video').addEventListener('click', event => {
    startLocalStream();
});

function getDevices() {
    // AFAICT in Safari this only gets default devices until gUM is called :/
    return navigator.mediaDevices.enumerateDevices();
}

function gotDevices(deviceInfos) {
    window.deviceInfos = deviceInfos; // make available to console
    clog('Available input and output devices:', deviceInfos);
    for (const deviceInfo of deviceInfos) {
        if (!(deviceInfo.kind == "audioinput") && !(deviceInfo.kind == "videoinput")) {
            continue;
        }
        clog('deviceId ' + deviceInfo.deviceId);
        clog('kind ' + deviceInfo.kind);
        clog('label ' + deviceInfo.label);
        if (deviceInfo.kind === 'audioinput') {
            clog('label2 ' + deviceInfo.label || 'Microphone')
        } else if (deviceInfo.kind === 'videoinput') {
            clog('label2 ' + deviceInfo.label || 'Camera')
        }
        clog('<br />');
    }
}

function getStream() {
    return navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    });
}

getStream().then(getDevices).then(gotDevices);

function findNextVideoDeviceId() {
    let deviceId = null;
    for (let i = 0; i < window.deviceInfos.length; i++) {
        let device = window.deviceInfos[i];
        if (device.kind == "videoinput") {
            indexUsedVideoSource = i;
            return device.deviceId;
        }
    }
    indexUsedVideoSource = null;
    return undefined;
}

const handleLogin = async success => {
    if (success === false) {
        alert('😞 Username already taken')
    } else {
        document.querySelector('div#login').style.display = 'none'
        document.querySelector('div#call').style.display = 'block'
    }

    startLocalStream();
}

const startLocalStream = async () => {
    try {
        let videoSource = indexUsedVideoSource ? window.deviceInfos[indexUsedVideoSource].deviceId : findNextVideoDeviceId();
        localStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: (videoSource && videoSource !== true) ? { exact: videoSource } : true},
            audio: true
        })
    } catch (error) {
        alert(`${error.name}`)
        console.error(error)
    }

    const tracks = localStream.getTracks();
    for (var i = 0; i < tracks.length; i++) {
        clog(i + ' ' + tracks[i].kind + ' ' + tracks[i].label + ' ' + tracks[i].enabled + ' ' + tracks[i].muted);
    }

    document.querySelector('video#local').srcObject = localStream
}

function isInACall(value) {
    if (value) {
        document.querySelector('button#call').setAttribute('disabled', true);
    } else {
        document.querySelector('button#call').removeAttribute('disabled');
    }
    inCall = value;
}

function createConnection() {
    const configuration = {
        iceServers : turnProvider
    }

    connection = new RTCPeerConnection(configuration)

    connection.oniceconnectionstatechange = function(e) {
        clog('ice state change ' + connection.iceConnectionState);
        clog(e);
    }

    connection.addStream(localStream)

    connection.onaddstream = event => {
        document.querySelector('video#remote').srcObject = event.stream
    }

    connection.onicecandidate = event => {
        if (event.candidate) {
            sendMessage({ type: 'candidate', candidate: event.candidate })
        }
    }

    return connection;
}

document.querySelector('button#call').addEventListener('click', () => {
    const userToCall = document.querySelector('input#username-to-call').value

    if (userToCall.length === 0) {
        alert('Enter a username 😉')
        return
    }

    remoteUsername = userToCall

    isInACall(true);
    connection = createConnection()
    connection.createOffer(
        offer => {
            sendMessage({ type: 'offer', offer: offer })
            connection.setLocalDescription(offer)
        },
        error => {
            isInACall(false);
            alert('Error when creating an offer')
            // console.error(error)
        }
    )
})

document.querySelector('button#close-call').addEventListener('click', () => {
    sendMessage({ type: 'close' })
    handleClose()
})

const handleOffer = (offer, username) => {
    connection = createConnection()
    remoteUsername = username
    connection.setRemoteDescription(new RTCSessionDescription(offer))
    connection.createAnswer(
        answer => {
            isInACall(true);
            connection.setLocalDescription(answer)
            sendMessage({ type: 'answer', answer: answer })
        },
        error => {
            isInACall(false);
            alert('Error when creating an answer')
            // console.error(error)
        }
    )
}

const handleAnswer = answer => {
    connection.setRemoteDescription(new RTCSessionDescription(answer))
}

const handleCandidate = candidate => {
    connection.addIceCandidate(new RTCIceCandidate(candidate))
}

const handleClose = () => {
    isInACall(false);
    remoteUsername = null
    document.querySelector('video#remote').src = null
    connection.close()
    connection.onicecandidate = null
    connection.onaddstream = null
}
