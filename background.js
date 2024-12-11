chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed")
})

let currentSocket = null

let recentAnswer = null

function socketMessage(messageEvent) {
    const message = messageEvent.data

    console.log(`Got sent message: ${message}`)

    if (message == "<|ACK|>") {
        console.log("Received socket acknowledgement")
    } else {
        data = JSON.parse(message)
        if (data.code == 2) {
            recentAnswer = data.answer
        } else {
            recentAnswer = false
        }
    }
}

function sendSocketClose(connected) {
    chrome.runtime.sendMessage({
        code: 11,
        isConnected: false || connected
    })
}

function attemptServerConnect(ip, port) {
    const sockUrl = `ws://${ip}:${port}`
    let websocket = null

    try {
        websocket = new WebSocket(sockUrl)
    } catch (error) {
        sendSocketClose()
    }

    websocket.addEventListener("open", (event) => {
        console.log(`Connected to ${sockUrl}`)
        setTimeout(() => {
            console.log("turned button green")
            sendSocketClose(true)
        }, 100)
    })

    websocket.addEventListener("close", (event) => {
        console.log(`Socket: ${sockUrl} closed`)
        currentSocket = null
        sendSocketClose()
    })

    websocket.addEventListener("error", (event) => {
        // console.error("WebSocket error:", event)
        sendSocketClose()
    })

    websocket.addEventListener("message", socketMessage)

    return websocket
}

function getAnswerForQuestion(question) {
    str_packet = JSON.stringify({
        action: "qtoa",
        data: question
    })

    if (currentSocket == null) {
        return null
    }

    currentSocket.send(str_packet)

    return new Promise((resolve) => {
        const checkAnswer = () => {
            if (recentAnswer !== null) {
                const answer = recentAnswer;
                recentAnswer = null;  // Reset for next question
                resolve(answer !== false ? answer : null); 
            } else {
                // Retry after a short delay
                setTimeout(checkAnswer, 100); 
            }
        };

        checkAnswer();
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.action == "Connect") {

        console.log(`Received connection flag, to ${message.ip}:${message.port}`)

        if (currentSocket && currentSocket.OPEN) {
            sendResponse({
                code: 1,
                codeMessage: `Connection to ${message.ip}:${message.port} aborted, disconnect before trying to reconnect`
            });
            return;
        }

        const websocket = attemptServerConnect(message.ip, message.port);
        if (websocket != null) {
            currentSocket = websocket;
            sendResponse({
                code: 2,
                codeMessage: `Connection to ${message.ip}:${message.port} success`
            });
        } else {
            currentSocket = null;
            sendResponse({
                code: 5,
                codeMessage: "Failed to connect"
            });
        }
    }

    if (message.action == "QueryAnswer") {

        if (currentSocket == null) {
            sendResponse({
                code: 5,
                codeMessage: "No socket connection"
            })
        } else {
            let question = message.question
            getAnswerForQuestion(question).then((answer) => {
                sendResponse(answer)
            })
        }

    }

    if (message == "conncheck") {
        sendResponse(currentSocket != null)
    }

    if (message == "Disconnect") {
        if (currentSocket != null) {
            console.log("Closing socket")

            currentSocket.close()
            currentSocket = null
        }
    }

    return true

})

setInterval(() => {
    if (currentSocket != null) {
        currentSocket.send("keepalive")
    }
}, 30000)