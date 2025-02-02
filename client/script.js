document.getElementById("questionForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const prompt = document.getElementById("prompt").value;
    const responseContainer = document.getElementById("responseContainer");

    const userQuestion = document.createElement("div");
    userQuestion.innerHTML = `<p><strong>Q:</strong> ${prompt}</p>`;
    responseContainer.appendChild(userQuestion);

    const loadingMessage = document.createElement("p");
    loadingMessage.textContent = "Loading...";
    responseContainer.appendChild(loadingMessage);

    try {
        const response = await fetch("http://localhost:3000/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: prompt }),
        });

        const data = await response.json();
        responseContainer.removeChild(loadingMessage);

        if (response.ok) {
            const chapterDiv = document.createElement("div");
            chapterDiv.classList.add("chapter-response");
            chapterDiv.innerHTML = `<h3>${data.chapter}</h3><p>${data.tafsir}</p>`;
            responseContainer.appendChild(chapterDiv);
        } else {
            responseContainer.innerHTML += `<p><strong>Error:</strong> ${data.error}</p>`;
        }
    } catch (error) {
        responseContainer.removeChild(loadingMessage);
        responseContainer.innerHTML += `<p><strong>Error:</strong> ${error.message}</p>`;
    }

    document.getElementById("prompt").value = "";
});
