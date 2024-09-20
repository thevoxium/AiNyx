:root {
    --bg-color: #13141f;
    --text-color: #cdd6f4;
    --accent-color: #89b4fa;
    --secondary-color: #f5c2e7;
    --feature-bg: rgba(30, 32, 48, 0.8);
    --feature-hover: #2a2f4a;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'JetBrains Mono', monospace;
    background-color: var(--bg-color);
    color: var(--text-color);
    line-height: 1.6;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.hero-section {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
}

.hero-content {
    max-width: 600px;
    text-align: center;
    position: relative;
}

.hero-content::after {
    content: '';
    position: absolute;
    top: -20%;
    left: -20%;
    width: 140%;
    height: 140%;
    background: linear-gradient(45deg, var(--accent-color), var(--secondary-color));
    opacity: 0.05;
    z-index: -1;
    transform: skew(-15deg);
    border-radius: 30px;
}

.logo {
    margin-bottom: 2rem;
}

h1 {
    font-size: 3.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    line-height: 1.2;
    color: var(--secondary-color);
}

p {
    font-size: 1rem;
    margin-bottom: 1.5rem;
    color: var(--text-color);
}

.cta-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 1.5rem;
}

.button {
    display: inline-block;
    padding: 0.6rem 1.2rem;
    border-radius: 5px;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
    transition: background-color 0.3s ease, transform 0.3s ease;
}

.button:hover {
    transform: translateY(-2px);
}

.button.primary {
    background-color: var(--accent-color);
    color: var(--bg-color);
}

.button.secondary {
    background-color: var(--secondary-color);
    color: var(--bg-color);
}

.features-section {
    margin-top: 4rem;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
}

.feature-item {
    background-color: var(--feature-bg);
    padding: 1.5rem;
    border-radius: 8px;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.feature-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    background-color: var(--feature-hover);
}

.feature-item h3 {
    font-size: 1rem;
    margin-bottom: 0.5rem;
    color: var(--accent-color);
}

.feature-item p {
    font-size: 0.85rem;
    color: var(--text-color);
    opacity: 0.8;
}

@media (max-width: 1024px) {
    .features-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    h1 {
        font-size: 2.5rem;
    }
    .features-grid {
        grid-template-columns: 1fr;
    }
}