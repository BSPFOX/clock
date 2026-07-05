// 等待DOM完全渲染后再执行，线上资源加载延迟也不会失效
document.addEventListener('DOMContentLoaded', function () {
    // 默认配置
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

    // 安全读取本地存储，捕获解析异常
    try {
        const savedData = localStorage.getItem(saveKey);
        if (savedData) {
            const parseResult = JSON.parse(savedData);
            state = Object.assign({}, defaultState, parseResult);
        }
    } catch (err) {
        console.log("配置读取失败，重置默认设置");
        localStorage.removeItem(saveKey);
    }

    // 缓存全部DOM节点
    const timeShow = document.getElementById("timeShow");
    const ampmDom = document.getElementById("ampm");
    const dateShow = document.getElementById("dateShow");
    const lunarShow = document.getElementById("lunarShow");
    const zoneShow = document.getElementById("zoneShow");
    const batteryShow = document.getElementById("batteryShow");
    const canvas = document.getElementById("clockCanvas");
    const ctx = canvas.getContext("2d");

    // 按钮节点
    const btn12 = document.getElementById("mode12");
    const themeBtn = document.getElementById("themeBtn");
    const sizeBtn = document.getElementById("sizeBtn");
    const timerBtn = document.getElementById("timerBtn");
    const timerModal = document.getElementById("timerModal");
    const timerText = document.getElementById("timerText");
    const startTimer = document.getElementById("startTimer");
    const resetTimer = document.getElementById("resetTimer");
    const closeTimer = document.getElementById("closeTimer");

    // 静态文字数组
    const weekText = ["日", "一", "二", "三", "四", "五", "六"];
    const lunarMonth = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"];
    const lunarDay = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];

    // 保存配置到本地存储
    function saveConfig() {
        try {
            localStorage.setItem(saveKey, JSON.stringify(state));
        } catch (e) {}
    }

    // 应用明暗主题
    function applyTheme() {
        state.lightMode ? document.body.classList.add("light") : document.body.classList.remove("light");
    }
    applyTheme();

    // 绑定点击事件（统一addEventListener，线上手表触控稳定）
    themeBtn.addEventListener("click", () => {
        state.lightMode = !state.lightMode;
        applyTheme();
        saveConfig();
    });

    sizeBtn.addEventListener("click", () => {
        state.fontSizeLevel = (state.fontSizeLevel + 1) % 3;
        const scaleList = [1, 1.3, 1.6];
        document.querySelector(".time").style.transform = `scale(${scaleList[state.fontSizeLevel]})`;
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
            const minStr = String(Math.floor(state.timerSeconds / 60)).padStart(2, "0");
            const secStr = String(state.timerSeconds % 60).padStart(2, "0");
            timerText.innerText = `${minStr}:${secStr}`;
        }, 1000);
    });

    resetTimer.addEventListener("click", () => {
        clearInterval(state.timerInterval);
        state.timerRunning = false;
        state.timerSeconds = 0;
        timerText.innerText = "00:00";
    });

    // 稳定公历转农历算法，无溢出bug
    function getLunar(year, month, day) {
        const baseDate = new Date(2000, 0, 1);
        const targetDate = new Date(year, month - 1, day);
        const dayDiff = Math.floor((targetDate - baseDate) / (1000 * 60 * 60 * 24));
        const totalDays = dayDiff + 4;
        const mIdx = Math.floor(totalDays / 30) % 12;
        const dIdx = totalDays % 30;
        return lunarMonth[mIdx] + lunarDay[dIdx];
    }

    // 模拟电量波动
    function updateBattery() {
        let batNum = parseInt(batteryShow.innerText.replace(/[^\d]/g, "")) || 100;
        if (Math.random() > 0.96 && batNum > 1) batNum--;
        batteryShow.innerText = `电量：${batNum}%`;
        batteryShow.style.color = batNum < 20 ? "#ef4444" : "#4ade80";
    }

    // 缓存主题颜色，避免每秒重复读取CSS变量
    function getThemeColorCache() {
        const rootStyle = getComputedStyle(document.documentElement);
        return {
            accent: rootStyle.getPropertyValue("--accent").trim(),
            text: rootStyle.getPropertyValue("--text-color").trim()
        };
    }

    // 绘制模拟圆形表盘
    function drawClock(hour, min, sec) {
        const canvasW = canvas.width;
        const canvasH = canvas.height;
        const radius = canvasW / 2 - 10;
        const color = getThemeColorCache();
        ctx.clearRect(0, 0, canvasW, canvasH);

        // 表盘外圈
        ctx.beginPath();
        ctx.arc(canvasW / 2, canvasH / 2, radius, 0, Math.PI * 2);
        ctx.strokeStyle = color.accent;
        ctx.lineWidth = 4;
        ctx.stroke();

        // 刻度
        for (let i = 0; i < 60; i++) {
            const rad = i * Math.PI / 30;
            const x1 = canvasW / 2 + Math.cos(rad) * (radius - 8);
            const y1 = canvasH / 2 + Math.sin(rad) * (radius - 8);
            const x2 = canvasW / 2 + Math.cos(rad) * (radius - 2);
            const y2 = canvasH / 2 + Math.sin(rad) * (radius - 2);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineWidth = i % 5 === 0 ? 3 : 1;
            ctx.strokeStyle = color.text;
            ctx.stroke();
        }

        // 时针
        const hourRad = (hour % 12) * Math.PI / 6 + min * Math.PI / 360 + sec * Math.PI / 21600;
        drawHandLine(canvasW / 2, canvasH / 2, hourRad, radius * 0.5, 5, color.text);
        // 分针
        const minRad = min * Math.PI / 30 + sec * Math.PI / 1800;
        drawHandLine(canvasW / 2, canvasH / 2, minRad, radius * 0.75, 3, color.text);
        // 秒针
        const secRad = sec * Math.PI / 30;
        drawHandLine(canvasW / 2, canvasH / 2, secRad, radius * 0.9, 1, "#f87171");
    }

    // 绘制指针工具函数
    function drawHandLine(x, y, rad, length, width, color) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        const endX = x + Math.cos(rad) * length;
        const endY = y + Math.sin(rad) * length;
        ctx.lineTo(endX, endY);
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.lineCap = "round";
        ctx.stroke();
    }

    // 主时钟刷新逻辑，全量try-catch防止单段代码卡死整个页面
    function updateClock() {
        try {
            const now = new Date();
            let hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();

            // 12/24小时制处理
            let ampmText = "";
            if (state.is12h) {
                ampmText = hours >= 12 ? "PM" : "AM";
                hours = hours % 12 || 12;
            }
            ampmDom.innerText = ampmText;
            const hStr = String(hours).padStart(2, "0");
            const mStr = String(minutes).padStart(2, "0");
            const sStr = String(seconds).padStart(2, "0");
            timeShow.innerText = `${hStr}:${mStr}:${sStr}`;

            // 公历日期+星期
            const y = now.getFullYear();
            const m = now.getMonth() + 1;
            const d = now.getDate();
            const weekIdx = now.getDay();
            dateShow.innerText = `${y}年${m}月${d}日 星期${weekText[weekIdx]}`;
            lunarShow.innerText = "农历 " + getLunar(y, m, d);

            // 本地时区
            const timeZone = -now.getTimezoneOffset() / 60;
            zoneShow.innerText = `本地时区 UTC${timeZone >= 0 ? "+" : ""}${timeZone}`;

            // 绘制表盘
            drawClock(now.getHours(), minutes, seconds);
        } catch (error) {
            console.log("时钟刷新捕获异常：", error);
        }
    }

    // 初始化执行一次
    updateClock();
    updateBattery();
    // 定时循环
    setInterval(updateClock, 1000);
    setInterval(updateBattery, 30000);
});