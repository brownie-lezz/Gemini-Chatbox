const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");

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

// Function to scroll to the bottom of chat
const scrollToBottom = () => chatsContainer.scrollTo({ top: chatsContainer.scrollHeight, behavior: "smooth" });

// Typing effect for bot responses
const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;

  // Set interval to type each word
  const typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      botMsgDiv.classList.remove("loading");
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
    }
  }, 40);
};

// Function to send user input to API and get a response
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  textElement.textContent = "Thinking..."; // Ensure it's visible while waiting for API

  // Add user message to chat history
  chatHistory.push({
    role: "user",
    parts: [{ text: userMessage }]
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: chatHistory
      })
    });

    const data = await response.json();
    if (!response.ok || !data?.candidates?.length) throw new Error(data?.error?.message || "Invalid response");

    console.log("API Response:", data); // Check API response

    // Extract and format response text
    const responseText = data.candidates[0].content.parts[0]?.text || "I'm not sure how to respond.";
    const formattedResponse = responseText.replace(/\*\*([^*]+)\*\*/g, "$1").trim();

    typingEffect(formattedResponse, textElement, botMsgDiv); // 

  } catch (error) {
    console.error("Error:", error);
    textElement.textContent = "An error occurred. Please try again.";
  }
};

// Handle form submission
const handleFormSubmit = (e) => {
  e.preventDefault();
  userMessage = promptInput.value.trim();
  if (!userMessage) return;

  console.log("User submitted:", userMessage); // 

  promptInput.value = ""; // Reset input field

  // Generate user message HTML and add it to the chat container
  const userMsgHTML = `<p class="message-text">${userMessage}</p>`;
  const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  setTimeout(() => {
    // Show bot thinking message before actual response
    const botThinkingHTML = `
      <img src="google-gemini-icon.png" class="avatar">
      <p class="message-text">Thinking...</p>
    `;
    const botMsgDiv = createMsgElement(botThinkingHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    
    generateResponse(botMsgDiv); // ✅ Pass actual DOM element, not HTML string
  }, 600);
};

promptForm.addEventListener("submit", handleFormSubmit);
