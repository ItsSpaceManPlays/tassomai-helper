function messageCurrentTab(action, callback, answer) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0]

        if (activeTab) {
            chrome.tabs.sendMessage(activeTab.id, { action: action, answer: answer }, (response) => {
                if (chrome.runtime.lastError) {

                } else {
                    callback(response)
                }
            })
        }
    })
}

let extensionStatus = null
let statusDiv = null

function getStatusValue() {
    return new Promise((resolve) => {
        if (extensionStatus) {
            return extensionStatus
        } else {
            chrome.storage.sync.get("extensionStatus", (data) => {
                if (data.extensionStatus) {
                    extensionStatus = data.extensionStatus
                    resolve(extensionStatus)
                } else {
                    extensionStatus = "Ready!"
                    resolve(extensionStatus)
                }
            })
        }
    })
}

function setStatusValue(status) {
    chrome.storage.sync.set({ extensionStatus:  status})
    extensionStatus = status

    if (statusDiv) {
        console.log(`Set status to: ${status}`)
        statusDiv.textContent = "Status: " + status
    }
}

function sendConnect(ip, port) {

    console.log(`Sending connect request to ${ip}:${port}`)

    chrome.runtime.sendMessage(
        {
            action: "Connect",
            ip: ip,
            port: port
        },
        (response) => {
            if (!chrome.runtime.lastError) {
                if (response.code == 2) {
                    // connection succeeded
                    console.log(`Connection succeeded with code ${response.code}: ${response.codeMessage}`)

                    const connectionBanner = document.getElementById("conn-indicator")
                    const connBtn = document.getElementById("connect-btn")
                    const disconnBtn = document.getElementById("disconnect-btn")

                    const ipInp = document.getElementById("ip-inp")
                    const portInp = document.getElementById("port-inp")

                    if (connectionBanner) {
                        connectionBanner.className = "connecting"
                        connectionBanner.textContent = "Connecting"

                        ipInp.disabled = true
                        portInp.disabled = true

                        connBtn.disabled = true
                        disconnBtn.disabled = true
                    }
                } else {
                    console.log(`Failed to connect with error code ${response.code}: ${response.codeMessage}`)
                }
            } else {
                console.error(`connect runtime response failed:`, chrome.runtime.lastError)
            }
        }
    )

}

function sendDisconnect() {

    try {
        chrome.runtime.sendMessage("Disconnect")
    } catch (e) {
        console.error(e)
    }

    const connBtn = document.getElementById("connect-btn")
    const disconnBtn = document.getElementById("disconnect-btn")

    const ipInp = document.getElementById("ip-inp")
    const portInp = document.getElementById("port-inp")

    const connectionBanner = document.getElementById("conn-indicator")

    connectionBanner.className = ""
    connectionBanner.textContent = "Not connected"

    ipInp.disabled = false
    portInp.disabled = false

    connBtn.disabled = false
    disconnBtn.disabled = true

}

function getQuestion() {
    return new Promise((resolve) => {
        messageCurrentTab("getquestion", (result) => {
            resolve(result);
        });
    });
}

function getQuestionAnswer(question) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({
            action: "QueryAnswer",
            question: question
        }, (result) => {
            resolve(result)
        })
    })
}

function clickAnswer(answer) {
    messageCurrentTab("clickanswer", () => {}, answer)
}

document.addEventListener('DOMContentLoaded', async () => {

    const optionList = document.getElementsByClassName("question-list")[0]
    statusDiv  = document.getElementsByClassName("status-log")[0]

    const connBtn = document.getElementById("connect-btn")
    const disconnBtn = document.getElementById("disconnect-btn")
    const ipInp = document.getElementById("ip-inp")
    const portInp = document.getElementById("port-inp")

    const connectionBanner = document.getElementById("conn-indicator")

    document.getElementById("debug1").addEventListener('click', () => {
        console.log("Clickeroonied")

        messageCurrentTab("debug1", (response) => {
            console.log("Response from content script: \n" + response)
            let rString = new String(response).toString()
            console.log(rString)
            if (rString === "Fail") {
                setStatusValue("No questions")
                return
            }
            rString.split("\n").forEach((value, index) => {
                const itemToChange = optionList.getElementsByTagName("li")[index]
                if (itemToChange) {
                    itemToChange.textContent = value
                }
            })
            setStatusValue(`${rString.split("\n").length - 1} questions`)
        })

        getQuestion().then((result) => {
            console.log("Question:", result)
            getQuestionAnswer(result).then((answer) => {
                console.log("Answer:", answer)
                if (answer != null && answer != "None") {
                    clickAnswer(answer)
                }
            })
        })
    })

    connBtn.addEventListener("click", () => {
        const ip = ipInp.value || "127.0.0.1" 
        const port = portInp.value || "45254"

        sendConnect(ip, port)
    })

    disconnBtn.addEventListener("click", () => {
        sendDisconnect()
    })

    messageCurrentTab("debug1", (response) => {
        console.log("Response from content script: \n" + response)
        let rString = new String(response).toString()
        if (rString === "Fail") {
            return
        }
        rString.split("\n").forEach((value, index) => {
            const itemToChange = optionList.getElementsByTagName("li")[index]
            if (itemToChange) {
                itemToChange.textContent = value
            }
        })
    })

    chrome.runtime.onMessage.addListener((data, sender) => {
        if (data.code == 11) {
            const connected = data.isConnected
            if (connected) {
                connectionBanner.className = "connected"
                connectionBanner.textContent = "Connected"

                ipInp.disabled = true
                portInp.disabled = true

                connBtn.disabled = true
                disconnBtn.disabled = false
            } else {
                connectionBanner.className = ""
                connectionBanner.textContent = "Not connected"

                ipInp.disabled = false
                portInp.disabled = false

                connBtn.disabled = false
                disconnBtn.disabled = true
            }
        }
    })

    chrome.storage.sync.get(["ipInp", "portInp"], (data) => {
        if (data == null) {
            return
        }

        ipInp.value = data.ipInp || ''
        portInp.value = data.portInp || ''
    })

    ipInp.addEventListener("change", (ev) => {
        chrome.storage.sync.set({ 
            ipInp: ipInp.value,
            portInp: portInp.value
        })
    })

    portInp.addEventListener("change", (ev) => {
        chrome.storage.sync.set({ 
            ipInp: ipInp.value,
            portInp: portInp.value
        })
    })

    chrome.runtime.sendMessage("conncheck", (response) => {
        ipInp.disabled = response
        portInp.disabled = response

        connBtn.disabled = response
        disconnBtn.disabled = !response

        connectionBanner.className = response ? "connected" : ""
        connectionBanner.textContent = response ? "Connected" : "Not connected"
    })

    statusDiv.textContent = "Status: " + await getStatusValue()

})