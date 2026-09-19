# Stock Trade Simulator

A browser-based stock trading simulation dashboard for practicing portfolio decisions with live simulated prices.

## Features

- Simulated real-time prices for AAPL, GOOG, TSLA, AMZN, and NVDA
- Market buy and sell orders
- Automated limit buy orders
- Portfolio value, net worth, cash, and profit/loss tracking
- Interactive Chart.js price history
- Simulated market news events
- Activity and order logs
- LocalStorage persistence between sessions
- Responsive layout for desktop and mobile

## Run locally

No build tools are required. Open `index.html` in a modern browser, or serve the folder with any static web server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Project structure

```text
.
├── index.html       # Application markup
├── css/
│   └── style.css    # Dashboard styles
├── js/
│   └── app.js       # Market, portfolio, and order logic
└── README.md
```

Chart.js is loaded from the jsDelivr CDN.
