import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App container not found.");
}

app.innerHTML = `
  <main class="game">
    <header class="game-header">
      <div>
        <h1>Einmaleins</h1>
        <p class="round">Runde 1</p>
      </div>

      <div class="stats">
        <span>Punkte: <strong id="score">0</strong></span>
        <span>Zeit: <strong id="time">10:00</strong></span>
      </div>
    </header>

    <section class="task" aria-label="Aufgabe">
      <div class="task-equation">
        <span id="factor-a">?</span>
        <span>×</span>
        <span id="factor-b">?</span>
        <span>=</span>
        <span id="answer">?</span>
      </div>

      <p id="feedback" class="feedback" aria-live="polite">
        Gib deine Antwort ein.
      </p>
    </section>

    <section class="keypad" aria-label="Zahlenfeld">
      <button type="button">1</button>
      <button type="button">2</button>
      <button type="button">3</button>

      <button type="button">4</button>
      <button type="button">5</button>
      <button type="button">6</button>

      <button type="button">7</button>
      <button type="button">8</button>
      <button type="button">9</button>

      <button type="button" class="keypad-zero">0</button>
    </section>
  </main>
`;
