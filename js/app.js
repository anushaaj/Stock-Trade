class Stock {
    constructor(symbol, name, price) {
        this.symbol = symbol;
        this.name = name;
        this.currentPrice = price;
        this.previousPrice = price;
        this.history = [price];
    }

    tick(multiplier = 1) {
        this.previousPrice = this.currentPrice;
        const change = (Math.random() * 5 - 2.5) / 100;
        this.currentPrice = Math.max(1, +(this.currentPrice * (1 + change * multiplier)).toFixed(2));
        this.history.push(this.currentPrice);
        if (this.history.length > 20) this.history.shift();
    }

    changePercent() {
        return ((this.currentPrice - this.previousPrice) / this.previousPrice) * 100;
    }
}

class TradingPlatform {
    constructor() {
        this.stocks = [
            new Stock("AAPL", "Apple Inc.", 175.50),
            new Stock("GOOG", "Alphabet Inc.", 150.25),
            new Stock("TSLA", "Tesla Corporation", 180.10),
            new Stock("AMZN", "Amazon.com, Inc.", 178.40),
            new Stock("NVDA", "NVIDIA Corporation", 875.12)
        ];
        this.cash = 10000;
        this.holdings = {};
        this.limitOrders = [];
        this.selectedSymbol = "AAPL";
        this.mode = "MARKET";
        this.storageKey = "stock-trade-simulator";
        this.chart = null;
        this.news = [
            ["NVDA announces a breakthrough in quantum processing.", "NVDA", 2.8],
            ["Regulatory inquiries increase pressure on Apple ecosystems.", "AAPL", -2.2],
            ["Amazon expands smart logistics automation networks.", "AMZN", 1.9],
            ["Materials bottlenecks affect Tesla vehicle production.", "TSLA", -2.5],
            ["Google Cloud usage expands across global infrastructure.", "GOOG", 1.7]
        ];
    }

    start() {
        this.load();
        this.bindEvents();
        this.renderStockOptions();
        this.renderChart();
        this.render();
        this.logAudit("Trading simulator started.");
        setInterval(() => this.marketCycle(), 3000);
    }

    bindEvents() {
        document.querySelector("#stock-select").addEventListener("change", event => {
            this.selectedSymbol = event.target.value;
            this.renderChart();
            this.updatePreview();
            this.render();
        });
        document.querySelector("#order-quantity").addEventListener("input", () => this.updatePreview());
        document.querySelector("#tab-market").addEventListener("click", () => this.setMode("MARKET"));
        document.querySelector("#tab-limit").addEventListener("click", () => this.setMode("LIMIT"));
        document.querySelector("#buy-button").addEventListener("click", () => this.executeMarketOrder("BUY"));
        document.querySelector("#sell-button").addEventListener("click", () => this.executeMarketOrder("SELL"));
        document.querySelector("#limit-button").addEventListener("click", () => this.queueLimitOrder());
        document.querySelector("#reset-button").addEventListener("click", () => this.reset());
    }

    marketCycle() {
        this.stocks.forEach(stock => stock.tick());
        if (Math.random() < 0.15) this.applyNewsEvent();
        this.processLimitOrders();
        this.render();
        this.updateChart();
        this.save();
    }

    applyNewsEvent() {
        const [headline, symbol, bias] = this.news[Math.floor(Math.random() * this.news.length)];
        const stock = this.getStock(symbol);
        stock.tick(Math.abs(bias) * (bias > 0 ? 1.5 : -1.5));
        this.logNews(headline);
    }

    getStock(symbol = this.selectedSymbol) {
        return this.stocks.find(stock => stock.symbol === symbol);
    }

    selectedQuantity() {
        return Number.parseInt(document.querySelector("#order-quantity").value, 10);
    }

    setMode(mode) {
        this.mode = mode;
        document.querySelector("#tab-market").classList.toggle("active", mode === "MARKET");
        document.querySelector("#tab-limit").classList.toggle("active", mode === "LIMIT");
        document.querySelector("#market-actions").classList.toggle("hidden", mode !== "MARKET");
        document.querySelector("#limit-button").classList.toggle("hidden", mode !== "LIMIT");
        document.querySelector("#limit-price-group").classList.toggle("hidden", mode !== "LIMIT");
        document.querySelector("#preview-cost-label").textContent = mode === "MARKET" ? "Estimated cost" : "Target cost";
        this.updatePreview();
    }

    executeMarketOrder(type) {
        const quantity = this.selectedQuantity();
        const stock = this.getStock();
        if (!stock || !Number.isInteger(quantity) || quantity <= 0) return alert("Enter a valid whole-number quantity.");
        const total = +(stock.currentPrice * quantity).toFixed(2);
        const position = this.holdings[stock.symbol];

        if (type === "BUY") {
            if (this.cash < total) return this.reject("Buy rejected: insufficient cash.");
            this.cash = +(this.cash - total).toFixed(2);
            if (!position) this.holdings[stock.symbol] = { shares: 0, cost: 0 };
            this.holdings[stock.symbol].shares += quantity;
            this.holdings[stock.symbol].cost = +(this.holdings[stock.symbol].cost + total).toFixed(2);
        } else {
            if (!position || position.shares < quantity) return this.reject("Sell rejected: insufficient shares.");
            position.shares -= quantity;
            position.cost = +(position.cost - (position.cost / (position.shares + quantity)) * quantity).toFixed(2);
            this.cash = +(this.cash + total).toFixed(2);
            if (position.shares === 0) delete this.holdings[stock.symbol];
        }
        this.logAudit(`${type} ${quantity} ${stock.symbol} at $${stock.currentPrice.toFixed(2)}.`);
        this.render();
        this.save();
    }

    queueLimitOrder() {
        const quantity = this.selectedQuantity();
        const target = Number.parseFloat(document.querySelector("#order-limit-price").value);
        if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(target) || target <= 0) return alert("Enter valid order values.");
        this.limitOrders.push({ id: crypto.randomUUID(), symbol: this.selectedSymbol, quantity, target });
        this.logAudit(`Limit buy queued: ${quantity} ${this.selectedSymbol} at $${target.toFixed(2)}.`);
        this.renderLimitOrders();
        this.save();
    }

    processLimitOrders() {
        this.limitOrders = this.limitOrders.filter(order => {
            const stock = this.getStock(order.symbol);
            if (stock.currentPrice > order.target) return true;
            const total = +(stock.currentPrice * order.quantity).toFixed(2);
            if (this.cash < total) {
                this.logAudit(`Limit order skipped: insufficient cash for ${order.symbol}.`);
                return false;
            }
            this.cash = +(this.cash - total).toFixed(2);
            if (!this.holdings[order.symbol]) this.holdings[order.symbol] = { shares: 0, cost: 0 };
            this.holdings[order.symbol].shares += order.quantity;
            this.holdings[order.symbol].cost = +(this.holdings[order.symbol].cost + total).toFixed(2);
            this.logAudit(`Limit order executed: ${order.quantity} ${order.symbol} at $${stock.currentPrice.toFixed(2)}.`);
            return false;
        });
        this.renderLimitOrders();
    }

    cancelLimitOrder(id) {
        this.limitOrders = this.limitOrders.filter(order => order.id !== id);
        this.logAudit("Limit order canceled.");
        this.renderLimitOrders();
        this.save();
    }

    render() {
        const marketBody = document.querySelector("#market-table-body");
        marketBody.innerHTML = this.stocks.map(stock => {
            const change = stock.changePercent();
            return `<tr class="selectable-row ${stock.symbol === this.selectedSymbol ? "selected-stock" : ""}" data-symbol="${stock.symbol}"><td><strong>${stock.symbol}</strong></td><td>${stock.name}</td><td>$${stock.currentPrice.toFixed(2)}</td><td class="${change >= 0 ? "up" : "down"}">${change >= 0 ? "+" : ""}${change.toFixed(2)}%</td></tr>`;
        }).join("");
        marketBody.querySelectorAll("tr").forEach(row => row.addEventListener("click", () => {
            this.selectedSymbol = row.dataset.symbol;
            document.querySelector("#stock-select").value = this.selectedSymbol;
            this.renderChart();
            this.render();
        }));

        let assetValue = 0;
        const portfolioBody = document.querySelector("#portfolio-table-body");
        portfolioBody.innerHTML = Object.entries(this.holdings).map(([symbol, position]) => {
            const stock = this.getStock(symbol);
            const value = position.shares * stock.currentPrice;
            const pnl = value - position.cost;
            assetValue += value;
            return `<tr><td><strong>${symbol}</strong></td><td>${position.shares}</td><td>$${(position.cost / position.shares).toFixed(2)}</td><td>$${position.cost.toFixed(2)}</td><td>$${value.toFixed(2)}</td><td class="${pnl >= 0 ? "up" : "down"}">$${pnl.toFixed(2)}</td></tr>`;
        }).join("");
        const netWorth = this.cash + assetValue;
        this.setText("#dash-cash", this.money(this.cash));
        this.setText("#dash-assets", this.money(assetValue));
        this.setText("#dash-net-worth", this.money(netWorth));
        this.setText("#dash-performance", `${netWorth >= 10000 ? "+" : ""}${((netWorth - 10000) / 100).toFixed(2)}%`);
        document.querySelector("#dash-performance").className = netWorth >= 10000 ? "up" : "down";
        this.updatePreview();
    }

    renderStockOptions() {
        document.querySelector("#stock-select").innerHTML = this.stocks.map(stock => `<option value="${stock.symbol}">${stock.symbol} - ${stock.name}</option>`).join("");
        document.querySelector("#stock-select").value = this.selectedSymbol;
    }

    renderLimitOrders() {
        const container = document.querySelector("#active-limit-orders");
        if (!this.limitOrders.length) return void (container.innerHTML = "No pending limit orders.");
        container.innerHTML = this.limitOrders.map(order => `<span class="order-tag"><strong>${order.symbol}</strong> ${order.quantity} at $${order.target.toFixed(2)} <span class="cancel-order" data-id="${order.id}">X</span></span>`).join("");
        container.querySelectorAll(".cancel-order").forEach(button => button.addEventListener("click", () => this.cancelLimitOrder(button.dataset.id)));
    }

    renderChart() {
        const stock = this.getStock();
        document.querySelector("#chart-title").textContent = `${stock.symbol} price history`;
        if (this.chart) this.chart.destroy();
        this.chart = new Chart(document.querySelector("#live-price-chart"), { type: "line", data: { labels: stock.history.map((_, index) => `T-${stock.history.length - index - 1}`), datasets: [{ data: stock.history, borderColor: "#38bdf8", backgroundColor: "rgba(56,189,248,.08)", fill: true, tension: .2, pointRadius: 2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
    }

    updateChart() {
        const stock = this.getStock();
        if (!this.chart) return;
        this.chart.data.labels = stock.history.map((_, index) => `T-${stock.history.length - index - 1}`);
        this.chart.data.datasets[0].data = stock.history;
        this.chart.update("none");
    }

    updatePreview() {
        const stock = this.getStock();
        const quantity = this.selectedQuantity();
        const price = this.mode === "LIMIT" ? Number.parseFloat(document.querySelector("#order-limit-price").value) : stock?.currentPrice;
        this.setText("#order-preview-cost", stock && quantity > 0 && price > 0 ? this.money(price * quantity) : "$0.00");
    }

    reject(message) { this.logAudit(message); alert(message); }
    setText(selector, value) { document.querySelector(selector).textContent = value; }
    money(value) { return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
    logAudit(message) { this.addLog("#audit-log", message, "log-entry"); }
    logNews(message) { this.addLog("#news-log", message, "log-entry log-news"); }
    addLog(selector, message, className) { const node = document.createElement("div"); node.className = className; node.textContent = `[${new Date().toLocaleTimeString()}] ${message}`; const box = document.querySelector(selector); box.appendChild(node); box.scrollTop = box.scrollHeight; }

    save() { localStorage.setItem(this.storageKey, JSON.stringify({ cash: this.cash, holdings: this.holdings, limitOrders: this.limitOrders })); }
    load() { const saved = JSON.parse(localStorage.getItem(this.storageKey) || "null"); if (saved) { this.cash = saved.cash ?? 10000; this.holdings = saved.holdings ?? {}; this.limitOrders = saved.limitOrders ?? []; } }
    reset() { if (!confirm("Reset the portfolio and clear saved data?")) return; localStorage.removeItem(this.storageKey); this.cash = 10000; this.holdings = {}; this.limitOrders = []; this.render(); this.renderLimitOrders(); this.logAudit("Portfolio reset."); }
}

const tradingPlatform = new TradingPlatform();
window.addEventListener("load", () => tradingPlatform.start());
