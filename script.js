const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = document.createElement("input");
const fileLabel = document.createElement("span");
const cancelFileBtn = document.createElement("button");
const fileContainer = document.createElement("div");
const stopRespondBtn = document.getElementById("stop-respond-btn");

// Configure file input
fileInput.type = "file";
fileInput.style.display = "none";
fileLabel.textContent = "No file selected";
cancelFileBtn.textContent = "✖";
cancelFileBtn.style.display = "none";

fileContainer.appendChild(fileLabel);
fileContainer.appendChild(cancelFileBtn);
promptForm.appendChild(fileContainer);

document.getElementById("add-file-btn").addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
        fileLabel.textContent = fileInput.files[0].name;
        cancelFileBtn.style.display = "inline-block";
    } else {
        fileLabel.textContent = "No file selected";
        cancelFileBtn.style.display = "none";
    }
});

cancelFileBtn.addEventListener("click", () => {
    fileInput.value = "";
    fileLabel.textContent = "No file selected";
    cancelFileBtn.style.display = "none";
});

// API setup
const API_KEY = "AIzaSyBZsI6GD__wQdetknVZBrA6fCBeQScQaQM";  // Replace with your actual API key
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

let controller;
let typingInterval;
const chatHistory = [];

// Function to create message elements
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

// Function to scroll to the bottom of chat
const scrollToBottom = () => chatsContainer.scrollTo({ top: chatsContainer.scrollHeight, behavior: "smooth" });

// Typing effect for bot responses
const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;

    typingInterval = setInterval(() => {
        if (wordIndex < words.length) {
            textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
            botMsgDiv.classList.remove("loading");
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
        }
    }, 40);
};

// Function to convert file to Base64
const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]); // Extract base64 content
        reader.onerror = (error) => reject(error);
    });
};

// Function to send user input and file to API
const generateResponse = async (botMsgDiv, userMessage, fileData, fileType) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    textElement.textContent = "Thinking...";

    // Create a new AbortController for each request
    controller = new AbortController();

    // Prepare message parts for API
    const messageParts = [{ text: userMessage }];
    if (fileData && fileType) {
        messageParts.push({
            inlineData: {
                mimeType: fileType,
                data: fileData
            }
        });
    }

    chatHistory.push({
        role: "user",
        parts: messageParts
    });

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory }),
            signal: controller.signal // Attach the signal to the fetch request
        });

        const data = await response.json();
        if (!response.ok || !data?.candidates?.length) throw new Error(data?.error?.message || "Invalid response");

        const responseText = data.candidates[0].content.parts[0]?.text || "I'm not sure how to respond.";
        typingEffect(responseText, textElement, botMsgDiv);
    } catch (error) {
        if (error.name === "AbortError") {
            textElement.textContent = "Response stopped.";
        } else {
            console.error("Error:", error);
            textElement.textContent = "An error occurred. Please try again.";
        }
    }
};

// Handle form submission
const handleFormSubmit = async (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    const file = fileInput.files[0];

    if (!userMessage && !file) return;

    promptInput.value = "";

    let fileData = null;
    let fileType = null;

    if (file) {
        fileType = file.type;
        fileData = await convertFileToBase64(file);
        const fileMsgHTML = `<p class="message-text">Uploaded file: ${file.name}</p>`;
        chatsContainer.appendChild(createMsgElement(fileMsgHTML, "user-message"));
        fileInput.value = "";
        fileLabel.textContent = "No file selected";
        cancelFileBtn.style.display = "none";
    }

    if (userMessage) {
        const userMsgHTML = `<p class="message-text">${userMessage}</p>`;
        chatsContainer.appendChild(createMsgElement(userMsgHTML, "user-message"));
    }

    setTimeout(() => {
        const botThinkingHTML = `
            <img src="google-gemini-icon.png" class="avatar">
            <p class="message-text">Thinking...</p>
        `;
        const botMsgDiv = createMsgElement(botThinkingHTML, "bot-message");
        chatsContainer.appendChild(botMsgDiv);
        generateResponse(botMsgDiv, userMessage, fileData, fileType);
    }, 600);
};

// Handle stop respond button click
const handleStopRespondClick = () => {
    if (controller) {
        controller.abort(); // Abort the fetch request
        clearInterval(typingInterval); // Clear typing effect interval

        // Show "Response stopped" message
        const stopMsgHTML = `<p class="message-text">Response stopped.</p>`;
        chatsContainer.appendChild(createMsgElement(stopMsgHTML, "system-message"));
        scrollToBottom();
    }
};

// Add event listener for stop respond button
stopRespondBtn.addEventListener("click", handleStopRespondClick);

promptForm.addEventListener("submit", handleFormSubmit);
