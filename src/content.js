console.log("Content script init")

const activeClassName = "swiper-slide ng-star-inserted swiper-slide-active"
const nextClassName = "swiper-slide ng-star-inserted swiper-slide-next"

let universal = document.getElementsByClassName(activeClassName)
console.log(universal)

let currentSelectedElement = null

// return a list of div elements that have a button somewhere in the descendants
function findButtons() {
    console.log(universal)

    let buttons = []

    let buttonContainer = universal[0]
    if (buttonContainer == undefined)
        return

    buttonContainer = buttonContainer.children[0].children[1]

    if (buttonContainer.children != undefined && buttonContainer.children.length > 3) {
        currentSelectedElement = buttonContainer

        Array.from(buttonContainer.children).forEach(button => {
            console.log(button)

            const realButton = button.children[0].children[0]
            if (realButton.tagName.toLowerCase() === "button") {
                buttons.push(realButton)
            }

        });
    }

    if (buttons.length > 0) {
        return buttons
    } else {
        return null
    }
}

function getQuestion() {
    try {
        for (let qtag of document.getElementsByTagName("question")) {
            console.log(qtag)
            console.log(qtag.parentElement.className)
            // "swiper-slide swiper-slide-visible swiper-slide-fully-visible swiper-slide-active ng-star-inserted"
            if (qtag.parentElement.className.includes("swiper-slide-active")) {
                q_text = qtag.children[0].children[1].textContent
                console.log("Found question:", q_text)
                return q_text
            }
        }
        return null
    } catch {
        console.log("Failed to find question")
        return null
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action == "debug1") {
        console.log("Debug 1 fired")

        setTimeout(() => {
            let rString = ""
            const foundButtons = findButtons()
            if (foundButtons === null || foundButtons === undefined) {
                sendResponse("Fail")
                return
            }
            foundButtons.forEach((value, index) => {
                rString += value.children[0].textContent + "\n"
            })

            sendResponse(rString)
        }, 0)

        return true;
    }

    if (message.action == "getquestion") {

        question = getQuestion()

        sendResponse(question)

        return true;

    }

    if (message.action == "clickanswer") {

        console.log("Registered click answer with:", message.answer)

        const foundButtons = findButtons()
        if (foundButtons == null) {
            return
        }

        foundButtons.forEach((bDiv) => {
            try {
                const button = bDiv
                console.log(bDiv.children[0].textContent, message.answer)

                if (bDiv.children[0].textContent == message.answer) {
                    console.log("Wooho skibidi toilet")
                    console.log(button)
                    button.click()
                }
            } catch (e) {
                console.error(e)
            }
        })

        sendResponse("aaa")

        return true;

    }
})