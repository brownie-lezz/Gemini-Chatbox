const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = document.createElement("input");
const fileLabel = document.createElement("span");
const cancelFileBtn = document.createElement("button");
const fileContainer = document.createElement("div");

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
    fileInput.value = ""; // Clear file input
    fileLabel.textContent = "No file selected";
    cancelFileBtn.style.display = "none";
});

// API setup
const API_KEY = "AIzaSyBZsI6GD__wQdetknVZBrA6fCBeQScQaQM";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

let userMessage = "";
const chatHistory = [];

// Function to create message elements
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

// Function to send user input to API and get a response
const generateResponse = async (botMsgDiv) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    textElement.textContent = "Thinking...";

    chatHistory.push({
        role: "user",
        parts: [{ text: userMessage }]
    });

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory })
        });

        const data = await response.json();
        if (!response.ok || !data?.candidates?.length) throw new Error(data?.error?.message || "Invalid response");

        const responseText = data.candidates[0].content.parts[0]?.text || "I'm not sure how to respond.";
        textElement.textContent = responseText;
    } catch (error) {
        console.error("Error:", error);
        textElement.textContent = "An error occurred. Please try again.";
    }
};

// Handle form submission
const handleFormSubmit = (e) => {
    e.preventDefault();
    userMessage = promptInput.value.trim();
    if (!userMessage && fileInput.files.length === 0) return;

    promptInput.value = "";

    if (fileInput.files.length > 0) {
        const fileName = fileInput.files[0].name;
        const fileMsgHTML = `<p class="message-text">Uploaded file: ${fileName}</p>`;
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
        generateResponse(botMsgDiv);
    }, 600);
};

promptForm.addEventListener("submit", handleFormSubmit);
