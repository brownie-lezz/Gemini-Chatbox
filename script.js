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
    fileInput.value = ""; // Clear file input
    fileLabel.textContent = "No file selected";
    cancelFileBtn.style.display = "none";
});

// API setup
const API_KEY = "AIzaSyBZsI6GD__wQdetknVZBrA6fCBeQScQaQM";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
const WEA THER_API_KEY = "a09546a6e2ed42a2a4164904241204"; // Replace with your actual API key

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
    const words = text.split(" ")
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

// Define a function that the model can call to control smart lights
const currentWeatherFunctionDeclarations = {
    name: 'get_current_weather',
    description: 'Get the current temperature of a particular city.',
    parameters: {
      type: 'object', // use plain strings
      properties: {
        city: {
          type: 'string',
          description: 'City name, state code, or country code (e.g., "London", "US", "New York, US")'
        }
      },
      required: ['city']
    }
  };

  const forecastWeatherFunctionDeclarations = {
    name: 'get_forecast_weather',  // Fixed typo: "weahther" to "weather"
    description: 'Get the forecast weather of a city on up to 3 days',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'City name, state code, or country code (e.g., "London", "US", "New York, US")'
        },
        day: {
          type: 'integer',
          description: 'The number of days for which the user has requested the weather forecast, starting from today. For example, if the user requests a forecast for 3 days, the forecast will include the weather for today, the next day, and the day after that'
        }
      },
      required: ['city', 'day']
    }
  };

  async function get_current_weather(city) {
    try {
      const weatherRes = await fetch(
        `http://api.weatherapi.com/v1/current.json?q=${city}&key=${WEATHER_API_KEY}`
      );
      if (!weatherRes.ok) throw new Error("City not found");
      const weatherData = await weatherRes.json();
  
      const temperature = weatherData.current.temp_c;
      const description = weatherData.current.condition.text;
      const humidity = weatherData.current.humidity
      const localTime = weatherData.location.localtime

      console.log(temperature, description, humidity, localTime)
      
      const modelRes = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: { parts: [{text: `city:${city}, temperature:${temperature}, description:${description}, humidity:${humidity}, localTime:${localTime}`}]},
            systemInstruction: { 
                parts:[{
                    text: "You will be given details of weather of a particular city including the city name, temperature in celcius, description (e.g. clear, rain), humidity and the local time. Your task is to return a short, friendly message summarizing the current weather, given in a natural, readable format"
                }], 
                role: "system"}
        }),
        signal: controller.signal,
      })
      const modelReturnData = await modelRes.json()
      if (!modelRes.ok) throw new Error("Model response failed");

      return modelReturnData.candidates[0].content.parts[0].text;
    } catch (error) {
      return `Could not retrieve weather for ${city}. Error: ${error.message}`;
    }
  }

  async function get_forecast_weather(city, day) {
    try {
        const weatherRes = await fetch(
          `http://api.weatherapi.com/v1/forecast.json?q=${city}&days=${day}&key=${WEATHER_API_KEY}`
        );
        if (!weatherRes.ok) throw new Error("City not found");
        const weatherData = await weatherRes.json();
        const dayArray = {}
        for (const forecastDay of weatherData.forecast.forecastday) {
            const dayObject = {
              date: forecastDay.date,
              condition: forecastDay.day.condition.text,  // Correct access to condition
              humidity: forecastDay.day.avghumidity,      // Correct access to humidity
              temperature: forecastDay.day.avgtemp_c      // Correct access to temperature
            };
            dayArray[forecastDay.date] = dayObject;  // Use the date as the key
          }
      
          // Generate a list of summaries for all days
          const weatherSummaries = weatherData.forecast.forecastday.map((day) => {
            return `On ${day.date}, the weather will be ${day.day.condition.text} with a temperature of ${day.day.avgtemp_c}°C and a humidity of ${day.day.avghumidity}%.`;
          });
      
          // Join the summaries into one string or just pass the array as-is
          const combinedSummary = weatherSummaries.join(" ");
        
        const modelRes = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              contents: { parts: [{text: combinedSummary}]},
              systemInstruction: { 
                parts:[{
                    text: "You will be provided with forecast weather data for a range of date. This data will include the city name, condition, humidity and temperature. Your task is to generate a short, friendly message summarizing the weather for that specific day in a natural, easy-to-understand format.Make the message concise, engaging, and easy to understand for the user."
                }], 
                role: "system"}
          }),
          signal: controller.signal,
        })
        const modelReturnData = await modelRes.json()
        if (!modelRes.ok) throw new Error("Model response failed");
  
        return modelReturnData.candidates[0].content.parts[0].text;
      } catch (error) {
        return `Could not retrieve weather for ${city}. Error: ${error.message}`;
      }
  }

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
          body: JSON.stringify({ 
            contents: chatHistory,
            tools: [
              {
                functionDeclarations: [currentWeatherFunctionDeclarations, forecastWeatherFunctionDeclarations],
              },
            ],
            systemInstruction: { 
                parts:[{
                    text: "You are a weather assistant. If the user asks about the current weather in any city, respond by calling the 'get_current_weather' function with the correct city name. Only call the function if the city is mentioned. Do not assume or make up weather information on your own. You are still able to answer user other kinds of questions that is not related to weather" 
                }], 
                role: "system"},
          }),
          signal: controller.signal,
        });
      
        const data = await response.json();
        if (!response.ok || !data?.candidates?.length) throw new Error(data?.error?.message || "Invalid response");
      
        // Loop through the parts
        for (const part of data.candidates[0].content.parts) {
          // 📌 Check if it's a functionCall
          if (part.functionCall && part.functionCall.name === 'get_current_weather') {
            console.log("Function get_current_weather was called");
      
            const city = part.functionCall.args?.city;
            const result = await get_current_weather(city);
      
            const function_response_part = {
              name: part.functionCall.name,
              response: {result}
            };
      
            chatHistory.push({ role: 'model', parts: [{ functionCall: part.functionCall }] });
            chatHistory.push({ role: 'user', parts: [{ functionResponse: function_response_part }] });
      
            typingEffect(result, textElement, botMsgDiv);
          } else if (part.functionCall && part.functionCall.name === 'get_forecast_weather') {
            console.log("Function get_forecast_weather was called");
      
            const city = part.functionCall.args?.city;
            const day = part.functionCall.args?.day
            const result = await get_forecast_weather(city, day);
      
            const function_response_part = {
              name: part.functionCall.name,
              response: {result}
            };
      
            chatHistory.push({ role: 'model', parts: [{ functionCall: part.functionCall }] });
            chatHistory.push({ role: 'user', parts: [{ functionResponse: function_response_part }] });
      
            typingEffect(result, textElement, botMsgDiv);
          }
      
          // 📌 Handle generated text
          if (part.text) {
            console.log("Text generated");
            chatHistory.push({ role: "model", parts: [{ text: part.text }] });
            typingEffect(part.text, textElement, botMsgDiv);
          }
        }
      
      } catch (err) {
        console.error("Error:", err);
        typingEffect(err.message, textElement, botMsgDiv)
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

// Add event listener for suggestion items
document.querySelectorAll('.suggestions-item').forEach(item => {
    item.addEventListener('click', () => {
        const suggestionText = item.querySelector('.text').textContent;
        promptInput.value = suggestionText;
        promptForm.dispatchEvent(new Event('submit'));
    });
});

promptForm.addEventListener("submit", handleFormSubmit);