// 等待DOM全部加载完成再执行代码
document.addEventListener('DOMContentLoaded', function () {
    // 全局默认状态
    const defaultState = {
        is12h: false,
        lightMode: false,
        fontSizeLevel: 0,
        timerRunning: false,
        timerSeconds: 0,
        timerInterval: null
    };
    const saveKey = "watchClockConfig";
    let state = { ...defaultState };

    // 安全读取本地存储，捕获JSON解析报错（修复首次打开崩溃）
    try {
        const saved = localStorage.getItem(saveKey);
        if (saved) {
            const parseData = JSON.parse(saved);
            state = { ...defaultState, ...parseData };
        }
    } catch (e) {
        console.log("配置读取异常，使用默认设置");
        localStorage.removeItem(saveKey);
    }

    // DOM元素缓存
    const timeShow = document.getElementById("timeShow");
    const ampmDom = document.getElementById("ampm");
    const dateShow = document.getElementById("dateShow");
    const lunarShow = document.getElementById("lunarShow");
    const zoneShow = document.getElementById("zoneShow");
    const batteryShow = document.getElementById("batteryShow");
    const canvas = document.getElementById("clockCanvas");
    const ctx = canvas.getContext("2d");

    // 按钮元素
    const btn12 = document.getElementById("mode12");
    const themeBtn = document.getElementById("themeBtn");
    const sizeBtn = document.getElementById("sizeBtn");
    const timerBtn = document.getElementById("timerBtn");
    const timerModal = document.getElementById("timerModal");
    const timerText = document.getElementById("timerText");
    const startTimer = document.getElementById("startTimer");
    const resetTimer = document.getElementById("resetTimer");
    const closeTimer = document.getElementById("closeTimer");

    const weekText = ["日", "一", "二", "三", "四", "五", "六"];
    const lunarMonth = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"];
    const lunarDay = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];

    // 保存配置
    function saveConfig() {
        try {
            localStorage.setItem(saveKey, JSON.stringify(state));
        } catch (e) { }
    }

    // 切换主题
    function applyTheme() {
        if (state.lightMode) document.body.classList.add("light");
        else document.body.classList.remove("light");
    }
    applyTheme();

    // 绑定按钮事件（统一addEventListener，修复点击失效）
    themeBtn.addEventListener("click", () => {
        state.lightMode = !state.lightMode;
        applyTheme();
        saveConfig();
    });

    sizeBtn.addEventListener("click", () => {
        state.fontSizeLevel = (state.fontSizeLevel + 1) % 3;
        const scale = [1, 1.3, 1.6][state.fontSizeLevel];
        document.querySelector(".time").style.transform = `scale(${scale})`;
        saveConfig();
    });

    btn12.addEventListener("click", () => {
        state.is12h = !state.is12h;
        saveConfig();
    });

    timerBtn.addEventListener("click", () => timerModal.classList.add("show"));
    closeTimer.addEventListener("click", () => timerModal.classList.remove("show"));

    startTimer.addEventListener("click", () => {
        if (state.timerRunning) return;
        state.timerRunning = true;
        state.timerInterval = setInterval(() => {
            state.timerSeconds++;
            const mm = String(Math.floor(state.timerSeconds / 60)).padStart(2, "0");
            const ss = String(state.timerSeconds % 60).padStart(2, "0");
            timerText.innerText = `${mm}:${ss}`;
        }, 1000);
    });

    resetTimer.addEventListener("click", () => {
        clearInterval(state.timerInterval);
        state.timerRunning = false;
        state.timerSeconds = 0;
        timerText.innerText = "00:00";
    });

    // 稳定公历转农历（修复原算法天数溢出bug）
    function getLunar(y, m, d) {
        const base = new Date(2000, 0, 1);
        const target = new Date(y, m - 1, d);
        const diffDay = Math.floor((target - base) / (1000 * 60 * 60 * 24));
        let totalDays = diffDay + 4;
        const monthIdx = Math.floor(totalDays / 30) % 12;
        const dayIdx = totalDays % 30;
        return lunarMonth[monthIdx] + lunarDay[dayIdx];
    }

    // 电量模拟
    function updateBattery() {
        let bat = parseInt(batteryShow.innerText.replace(/\D/g, "")) || 100;
        if (Math.random() > 0.96 && bat > 1) bat--;
        batteryShow.innerText = `电量：${bat}%`;
        batteryShow.style.color = bat < 20 ? "#ef4444" : "#4ade80";
    }

    // 缓存主题颜色，避免每秒重复读取CSS变量
    function getThemeColors() {
        const root = getComputedStyle(document.documentElement);
        return {
            accent: root.getPropertyValue("--accent").trim(),
            text: root.getPropertyValue("--text-color").trim()
        };
    }

    // 绘制表盘
    function drawClock(h, m, s) {
        const w = canvas.width;
        const hCanvas = canvas.height;
        const r = w / 2 - 10;
        const color = getThemeColors();
        ctx.clearRect(0, 0, w, hCanvas);

        // 外圈
        ctx.beginPath();
        ctx.arc(w / 2, hCanvas / 2, r, 0, Math.PI * 2);
        ctx.strokeStyle = color.accent;
        ctx.lineWidth = 4;
        ctx.stroke();

        // 刻度
        for (let i = 0; i < 60; i++) {
            const rad = i * Math.PI / 30;
            const x1 = w / 2 + Math.cos(rad) * (r - 8);
            const y1 = hCanvas / 2 + Math.sin(rad) * (r - 8);
            const x2 = w / 2 + Math.cos(rad) * (r - 2);
            const y2 = hCanvas / 2 + Math.sin(rad) * (r - 2);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth = i % 5 === 0 ? 3 : 1;
            ctx.strokeStyle = color.text;
            ctx.stroke();
        }

        // 时针
        const hRad = (h % 12) * Math.PI / 6 + m * Math.PI / 360 + s * Math.PI / 21600;
        drawLine(w / 2, hCanvas / 2, hRad, r * 0.5, 5, color.text);
        // 分针
        const mRad = m * Math.PI / 30 + s * Math.PI / 1800;
        drawLine(w / 2, hCanvas / 2, mRad, r * 0.75, 3, color.text);
        // 秒针
        const sRad = s * Math.PI / 30;
        drawLine(w / 2, hCanvas / 2, sRad, r * 0.9, 1, "#f87171");
    }
    function drawLine(x, y, rad, len, w, c) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        const endX = x + Math.cos(rad) * len;
        const endY = y + Math.sin(rad) * len;
        ctx.lineTo(endX, endY);
        ctx.lineWidth = w;
        ctx.strokeStyle = c;
        ctx.lineCap = "round";
        ctx.stroke();
    }

    // 主时钟刷新逻辑
    function updateClock() {
        try {
            const now = new Date();
            let hours = now.getHours();
            const min = now.getMinutes();
            const sec = now.getSeconds();

            let ampm = "";
            if (state.is12h) {
                ampm = hours >= 12 ? "PM" : "AM";
                hours = hours % 12 || 12;
            }
            ampmDom.innerText = ampm;
            const hStr = String(hours).padStart(2, "0");
            const mStr = String(min).padStart(2, "0");
            const sStr = String(sec).padStart(2, "0");
            timeShow.innerText = `${hStr}:${mStr}:${sStr}`;

            // 日期星期
            const y = now.getFullYear();
            const mo = now.getMonth() + 1;
            const d = now.getDate();
            const wk = now.getDay();
            dateShow.innerText = `${y}年${mo}月${d}日 星期${weekText[wk]}`;
            lunarShow.innerText = "农历 " + getLunar(y, mo, d);

            // 时区
            const zone = -now.getTimezoneOffset() / 60;
            zoneShow.innerText = `本地时区 UTC${zone >= 0 ? "+" : ""}${zone}`;

            drawClock(now.getHours(), min, sec);
        } catch (e) {
            console.log("时钟刷新异常:", e);
        }
    }

    // 启动循环
    updateClock();
    updateBattery();
    setInterval(updateClock, 1000);
    setInterval(updateBattery, 30000);
});